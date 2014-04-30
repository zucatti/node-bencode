var Stream = require( 'stream' )

function inspect() {
  process.stdout.write( '\n' )
  process.stdout.write(
    [].slice.call( arguments )
      .map( inspect.print )
      .join( ' ' )
  )
  process.stdout.write( '\n' )
}

inspect.print = function( object ) {
  return require( 'util' ).inspect( object, {
    colors: true,
    depth: null,
    showHidden: true
  })
}

function Decoder( options ) {
  
  if( !(this instanceof Decoder) )
    return new Decoder( options )
  
  this.options = options || {}
  this.options.objectMode = true
  // this.options.decodeStrings = false
  
  // Inherit from Transform stream
  Stream.Transform.call( this, this.options )
  
  this._state = 0x00
  this._depth = 0
  this._position = 0
  
  this._buffer = new Buffer( 0 )
  
}

module.exports = Decoder

Decoder.STATE = {
  STRING: 0x60,
  INT:    0x69,
  LIST:   0x6C,
  DICT:   0x64
}

Decoder.prototype = {
  
  constructor: Decoder,
  
  _indexOf: function( chr ) {
    
    var i = this._position
    var c = this._buffer.length
    var d = this._buffer
    
    while( i < c ) {
      if( d[i] === chr )
        return i
      i++
    }
    
    return -1
    
  },
  
  _transform: function( chunk, encoding, done ) {
    
    // If we have leftover bytes,
    // concat them with the incoming chunk
    this._buffer = this._position !== 0 ?
      Buffer.concat([ this._buffer, chunk ]) :
      chunk
    
    // inspect( '_transform', encoding, chunk )
    
    while( this._next() ) {
      continue
    }
    
    // Discard consumed bytes
    this._buffer = this._buffer.slice( this._position )
    this._position = 0
    
    // Aaaand... we're done.
    done()
    
  },
  
  _next: function( state ) {
    
    // If we're in a nested structure,
    // ignore the top level state
    if( this._depth === 0 ) {
      state = this._state = this._buffer[ this._position ]
    } else {
      // Read state from buffer
      state = this._buffer[ this._position ]
    }
    
    if( state == null ) {
      // inspect( 'End Of Chunk', this._position, this._buffer.length )
      return
    }
    
    // Ignore whitespace when we're idle
    if( this._depth === 0 ) {
      if( state === 0x0A || state === 0x0D || state === 0x20 || state === 0x09 ) {
        inspect( 'Ignoring whitespace...' )
        this._position++
        this._state = 0
        return
      }
    }
    
    // inspect( 'this', this )
    inspect( '_buffer', this._buffer + '', this._buffer )
    inspect( '_next', {
      _state: this._state && this._state.toString( 16 ),
      state: state && state.toString( 16 ),
      pos: this._position,
      depth: this._depth,
      buf: this._buffer.length
    })
    
    // Decide what we have to decode based on the state
    switch( state ) {
      case 0x64: return this._decodeDictionary(); break
      case 0x6C: return this._decodeList(); break
      case 0x69: return this._decodeInteger(); break
      default:   return this._decodeBytes(); break
    }
    
  },
  
  _decodeInteger: function() {
    
    var start = this._position + 1
    var end = this._indexOf( 0x65 )
    var number, value
    
    // inspect( '_integer', start, end )
    
    if( ~end ) {
      
      // Extract data
      number = this._buffer.toString( 'ascii', start, end )
      // Parse value as integer
      value = parseInt( number, 10 )
      
      // Push to readable buffer, if at top level
      if( this._depth === 0 )
        this.push( value )
      
      // We have found the EOD; reset state
      this._state = this._depth > 0 ?
        this._state : 0
      
      // Advance position
      this._position += end + 1 - this._position
      
      // And continue consuming
      return value
      
    }
    
    // Wait for more data
    return
    
  },
  
  _decodeBytes: function() {
    
    var start = this._position
    var sep = this._indexOf( 0x3A )
    
    // inspect( '_bytes', start, sep )
    
    if( ~sep ) {
      
      // Found end of string length, parse it and calculate
      // index of end of string from it
      var length = parseInt( this._buffer.toString( 'ascii', this._position, sep ), 10 )
      var end = ++sep + length
      
      // We have all we need; reset state
      this._state = this._depth > 0 ? this._state : 0
      // Advance position
      this._position = end
      
      // If the EOD is out of bounds, we wait for another chunk
      // by returning falsy, and thus breaking the consume-loop
      if( this._buffer[ end - 1 ] === undefined ) {
        // inspect( '_bytes', 'EOD OOB', end, this._buffer.length )
        return
      }
      
      // Read the value and decode with
      // given encoding if neccessary
      var value = this.options.encoding ?
        this._buffer.toString( this.options.encoding, sep, end ) :
        this._buffer.slice( sep, end )
      
      // Push to readable buffer, if at top level
      if( this._depth === 0 )
        this.push( value )
      
      // Return true to continue to consuming loop
      return value
      
    }
    
    // No length separator has been found,
    // wait for more data
    return
    
  },
  
  _decodeList: function() {
    
    var list = []
    var value = null
    
    this._position++
    this._depth++
    
    // inspect( '_list', this._depth, this._position )
    
    while( this._buffer[ this._position ] !== 0x65 ) {
      if( value = this._next() )
        list.push( value )
      else return
    }
    
    this._position++
    this._depth--
    
    // We have found the EOD; reset state
    this._state = this._depth > 0 ?
      this._state : 0
    
    // Push to readable buffer, if at top level
    if( this._depth === 0 )
      this.push( list )
    
    return list
    
  },
  
  _decodeDictionary: function() {
    
    var dict = {}
    var key, value, previous
    
    this._position++
    this._depth++
    
    // inspect( '_dict', this._depth, this._position )
    
    while( this._buffer[ this._position ] !== 0x65 ) {
      previous = this._position
      if( (key = this._next()) && (value = this._next()) ) {
        dict[ key.toString() ] = value
      } else {
        this._position = previous
        return
      }
    }
    
    this._position++
    this._depth--
    
    // We have found the EOD; reset state
    this._state = this._depth > 0 ?
      this._state : 0
    
    // Push to readable buffer, if at top level
    if( this._depth === 0 )
      this.push( dict )
    
    return dict
    
  },
  
}

// Inherit from Transform stream
Decoder.prototype.__proto__ =
  Stream.Transform.prototype
