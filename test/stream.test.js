var fs = require( 'fs' )
var assert = require( 'assert' )
var Stream = require( 'stream' )
var Bencode = require( '../' )

const TORRENT_FILE = __dirname + '/' + 'ubuntu-13.04-server-amd64.iso.torrent'
var torrent = fs.readFileSync( TORRENT_FILE )

var decoder = new Bencode.Decoder()
var encoder = new Bencode.Encoder()
var bencoder = new Bencode.Stream()

describe( "bencode", function() {
  describe( "Decoder", function() {
    
    it( 'should decode strings', function( done ) {
      
      var pass = new Stream.PassThrough()
      var decoder = new Bencode.Decoder()
          decoder.on( 'end', done )
          decoder.on( 'readable', function( value ) {
            while( value = decoder.read() ) {
              console.log( '\nvalue:', value + '' )
              assert.ok( Buffer.isBuffer( value ) )
            }
          })
      
      pass.pipe( decoder )
      
      pass.write( '4:asdf' )
      pass.write( '6::asdf:' )
      pass.write( '7:ö±sdf' )
      pass.end()
      
    })
    
    it( 'should decode integers and floats (as int)', function( done ) {
      
      var pass = new Stream.PassThrough()
      var decoder = new Bencode.Decoder()
          decoder.on( 'end', done )
          decoder.on( 'readable', function( value ) {
            while( value = decoder.read() ) {
              console.log( '\nvalue:', value )
              assert.ok( typeof value === 'number' )
            }
          })
      
      pass.pipe( decoder )
      
      pass.write( 'i1e' )
      pass.write( 'i+1e' )
      pass.write( 'i-1e' )
      pass.write( 'i1.5e' )
      pass.end()
      
    })
    
    it( 'should decode lists', function( done ) {
      
      var pass = new Stream.PassThrough()
      var decoder = new Bencode.Decoder()
          decoder.on( 'end', done )
          decoder.on( 'readable', function( value ) {
            while( value = decoder.read() ) {
              console.log( '\nvalue:', value )
              assert.ok( Array.isArray( value ) )
            }
          })
      
      pass.pipe( decoder )
      
      pass.write( 'li32ei12ee' )
      pass.write( 'l6::asdf:e' )
      pass.end()
      
    })
    
    it( 'should decode dicationaries', function( done ) {
      
      var pass = new Stream.PassThrough()
      var decoder = new Bencode.Decoder()
          decoder.on( 'end', done )
          decoder.on( 'readable', function( value ) {
            while( value = decoder.read() ) {
              console.log( '\nvalue:', value )
              assert.ok( value != null )
              assert.ok( typeof value === 'object' )
            }
          })
      
      pass.pipe( decoder )
      
      pass.write( 'd1:a2:bce' )
      pass.write( 'd1:a2:451:bi45ee' )
      pass.end()
      
    })
    
    // it( 'should ignore whitespace when in idle state', function( done ) {
      
    //   var pass = new Stream.PassThrough()
    //   var decoder = new Bencode.Decoder()
    //       decoder.on( 'end', done )
    //       decoder.on( 'readable', function( value ) {
    //         while( value = decoder.read() ) {
    //           console.log( '\nvalue:', value )
    //           assert.ok( value != null )
    //           assert.ok( typeof value === 'number' )
    //         }
    //       })
      
    //   pass.pipe( decoder )
      
    //   pass.write( 'i32e' )
    //   pass.write( ' \r\n' )
    //   pass.write( 'i64e' )
    //   pass.write( '  \n   \t  \r  ' )
    //   pass.write( 'i128e' )
    //   pass.end()
      
    // })
    
    // it( 'should be able to decode a torrent file', function( done ) {
      
    //   var decoder = new Bencode.Decoder()
    //   var readStream = fs.createReadStream( TORRENT_FILE )
      
    //   readStream.pipe( decoder )
    //     .on( 'end', done )
    //     .on( 'readable', function( value ) {
    //       while( value = decoder.read() ) {
    //         console.log( '\nvalue:', value )
    //         assert.ok( value != null )
    //         assert.ok( typeof value === 'object' )
    //       }
    //     })
      
    // })
    
  })
})
