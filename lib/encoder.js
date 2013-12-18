var Stream = require( 'stream' )

function Encoder( options ) {
  
  if( !(this instanceof Encoder) )
    return new Encoder( options )
  
  this.options = options || {}
  this.options.objectMode = true
  // this.options.decodeStrings = false
  
  // Inherit from Transform stream
  Stream.Transform.call( this, this.options )
  
  this._floatConversionDetected = false
  
}

module.exports = Encoder

Encoder.LIST = new Buffer( 'l' )
Encoder.DICT = new Buffer( 'd' )
Encoder.END = new Buffer( 'e' )

Encoder.prototype = {
  
  constructor: Encoder,
  
  _transform: function( data, encoding, done ) {
    // console.log( 'encoder::_transform', data )
    this._encode( data )
    done()
  },
  
  _encode: function( data ) {
    
    if( Buffer.isBuffer( data ) ) {
      this.push( new Buffer( data.length + ':' ) )
      this.push( data )
      return
    }
    
    switch( typeof data ) {
      case 'string':
        this._encodeBytes( data )
        break
      case 'number':
        this._encodeNumber( data )
        break
      case 'object':
        Array.isArray( data )
          ? this._encodeList( data )
          : this._encodeDict( data )
        break
    }
    
  },
  
  _encodeBytes: function( data ) {
    var length = Buffer.byteLength( data ).toString()
    this.push( new Buffer( length + ':' + data ) )
  },
  
  _encodeNumber: function( data ) {
    
    var max = 4294967295
    var hi = ( data / max ) << 0
    var lo = ( data % max  ) << 0
    var number = ( hi * max + lo )
    
    this.push( new Buffer( 'i' + number + 'e' ) )
    
    if( val !== data && !this._floatConversionDetected ) {
      this._floatConversionDetected = true
      console.warn(
        'WARNING: Possible data corruption detected with value "'+data+'":',
        'Bencoding only defines support for integers, value was converted to "'+number+'"'
      )
      console.trace()
    }
    
  },
  
  _encodeList: function( data ) {
    
    this.push( Encoder.LIST )
    
    for( var i = 0; i < data.length; i++ ) {
      this._encode( data[i] )
    }
    
    this.push( Encoder.END )
    
  },
  
  _encodeDict: function( data ) {
    
    this.push( Encoder.DICT )
    
    var i, keys = Object.keys( data ).sort()
    
    for( i = 0; i < keys.length; i++ ) {
      this._encodeBytes( keys[i] )
      this._encode( data[ keys[i] ] )
    }
    
    this.push( Encoder.END )
    
  }
  
}

// Inherit from Transform stream
Encoder.prototype.__proto__ =
  Stream.Transform.prototype
