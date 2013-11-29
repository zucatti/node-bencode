var Stream = require( 'stream' )

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
  this._dict = null
  this._list = null
  
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
    
    // console.log( '_transform', encoding, chunk )
    
    while( this._next() )
      continue
    
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
      // If we're in no state, read it from the buffer
      this._state = this._state === 0 ?
        this._buffer[ this._position ] :
        this._state
      state = this._state
    } else {
      // Read state from buffer
      state = this._buffer[ this._position ]
    }
    
    if( state == null ) {
      // console.log( 'End Of Chunk', this._position, this._buffer.length )
      return
    }
    
    // Ignore whitespace when we're idle
    if( this._depth === 0 ) {
      if( state === 0x0A || state === 0x0D || state === 0x20 ) {
        this._position++
        this._state = 0
        return
      }
    }
    
    // console.log( '_next', 'position', this._position )
    // console.log( '_next', 'depth', this._depth )
    // console.log( '_next', 'global', this._state.toString( 16 ) )
    // console.log( '_next', 'local', state.toString( 16 ) )
    
    // Decide what we have to decode based on the state
    switch( state ) {
      case 0x64: return this._decodeDictionary(); break
      case 0x6C: return this._decodeList(); break
      case 0x69: return this._decodeInteger(); break
      default:   return this._decodeBytes(); break
    }
    
  },
  
  _decodeDictionary: function() {
    
    var dict = this._dict || {}
    var key, value, previous
    
    this._position++
    this._depth++
    
    // console.log( '_dict', this._depth, this._position )
    
    while( this._buffer[ this._position ] !== 0x65 ) {
      previous = this._position
      if( (key = this._next()) && (value = this._next()) ) {
        dict[ key ] = value
      } else {
        this._position = previous
        return
      }
    }
    
    this._position++
    this._depth--
    
    // We have found the EOD; reset state
    this._state = this._depth > 0 ? this._state : 0
    // Push to readable buffer, if at top level
    if( this._depth === 0 ) this.push( dict )
    // Clear temporary data
    this._dict = null
    
    return dict
    
  },
  
  _decodeList: function() {
    
    var list = this._list || []
    var value = null
    
    this._position++
    this._depth++
    
    // console.log( '_list', this._depth, this._position )
    
    while( this._buffer[ this._position ] !== 0x65 ) {
      if( value = this._next() )
        list.push( value )
      else return
    }
    
    this._position++
    this._depth--
    
    // We have found the EOD; reset state
    this._state = this._depth > 0 ? this._state : 0
    // Push to readable buffer, if at top level
    if( this._depth === 0 ) this.push( list )
    // Clear temporary data
    this._list = null
    
    return list
    
  },
  
  _decodeInteger: function() {
    
    var start = this._position + 1
    var end = this._indexOf( 0x65 )
    var number, value
    
    // console.log( '_integer', start, end )
    
    if( ~end ) {
      
      // We have found the EOD; reset state
      this._state = this._depth > 0 ? this._state : 0
      // Advance position
      this._position += end + 1 - this._position
      
      // Extract data
      number = this._buffer.toString( 'ascii', start, end )
      // Parse value as integer
      value = parseInt( number, 10 )
      
      // Push to readable buffer, if at top level
      if( this._depth === 0 ) this.push( value )
      
      // And continue consuming
      return value
      
    }
    
    // Wait for more data
    return
    
  },
  
  _decodeBytes: function() {
    
    var start = this._position
    var bytes, sep = this._indexOf( 0x3A )
    var length, end, value
    
    // console.log( '_bytes', start, sep )
    
    if( ~sep ) {
      
      // Found end of string length, parse it and calculate
      // index of end of string from it
      length = parseInt( this._buffer.toString( 'ascii', this._position, sep ), 10 )
      end = ++sep + length
      
      // If the EOD is out of bounds, we wait for another chunk
      // by returning falsy, and thus breaking the consume-loop
      if( this._buffer[ end ] === undefined ) {
        // console.log( '_bytes', 'EOD OOB', end, this._buffer.length )
        return
      }
      
      // We have all we need; reset state
      this._state = this._depth > 0 ? this._state : 0
      // Advance position
      this._position = end
      
      // Read the value and decode with
      // given encoding if neccessary
      value = this.options.encoding ?
        this._buffer.toString( this.options.encoding, sep, end ) :
        this._buffer.slice( sep, end )
      
      // Push to readable buffer, if at top level
      if( this._depth === 0 ) this.push( value )
      
      // Return true to continue to consuming loop
      return value
      
    }
    
    // No length separator has been found,
    // wait for more data
    return
    
  }
  
}

// Inherit from Transform stream
Decoder.prototype.__proto__ =
  Stream.Transform.prototype
