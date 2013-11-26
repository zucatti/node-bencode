var Stream = require( 'stream' )

function Bencode( options ) {
  
  if( !(this instanceof Bencode) )
    return new Bencode( options )
  
  var self = this
  
  this.options = options || {}
  this.options.objectMode = true
  // this.options.decodeStrings = false
  
  // Inherit from Duplex stream
  Stream.Duplex.call( this, this.options )
  
  this._decoder = new Bencode.Decoder( options )
    .on( 'error', this.emit.bind( this ) )
    .once( 'end', function() { self.push( null ) })
    .on( 'data', function( chunk ) {
      if( !self.push( chunk ) )
        this.pause()
    })
  
  this._encoder = new Bencode.Encoder( options )
    .on( 'error', this.emit.bind( this ) )
    .once( 'finish', function() {
      self.end()
    })
  
  this.once( 'finish', function() {
    this._encoder.end()
  })
  
  this.on( 'pipe', function( src ) {
    // Incoming pipe: If it's not an object stream,
    // we better pipe it to the decoder
    // console.log( 'on::pipe', src._readableState.objectMode ? 'objectMode' : 'normalMode' )
    if( !src._readableState.objectMode ) {
      src.unpipe( this )
      src.pipe( this._decoder )
    }
  })
  
}

module.exports = Bencode

Bencode.Stream  = Bencode
Bencode.Encoder = require( './lib/encoder' )
Bencode.Decoder = require( './lib/decoder' )

Bencode.encode = require( './lib/encode' ),
Bencode.decode = require( './lib/decode' )

Bencode.prototype = {
  
  constructor: Bencode,
  
  _read: function( n ) {
    // console.log( 'duplex::_read', n )
    this._decoder.resume()
  },
  
  _write: function( chunk, encoding, done ) {
    // console.log( 'duplex::_write', encoding, chunk )
    return this._encoder.write( chunk, encoding, done )
  },
  
  pipe: function( dst ) {
    // Checking if the destination stream is an object stream,
    // to decide from which end to pipe out
    // console.log( 'duplex::pipe', dst._writableState.objectMode ? 'objectMode' : 'normalMode' )
    return dst._writableState.objectMode ?
      this._decoder.pipe( dst ) :
      this._encoder.pipe( dst )
  },
  
  unpipe: function( dst ) {
    // console.log( 'duplex::unpipe', dst._writableState.objectMode ? 'objectMode' : 'normalMode' )
    return dst._writableState.objectMode ?
      this._decoder.pipe( dst ) :
      this._encoder.pipe( dst )
  }
  
}

// Inherit from Duplex stream;
// Why we are not using util.inherit():
// Because it's dependant on where you call it.
// It screws up massively when not called before
// the first `exports` or `require`. Fucky stuff.
Bencode.prototype.__proto__ =
  Stream.Duplex.prototype
