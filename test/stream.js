var fs = require( 'fs' )
var Stream = require( 'stream' )
var Bencode = require( '../' )

const TORRENT_FILE = __dirname + '/' + 'ubuntu-13.04-server-amd64.iso.torrent'
var torrent = fs.readFileSync( TORRENT_FILE )

var decoder = new Bencode.Decoder()
var encoder = new Bencode.Encoder()
var bencoder = new Bencode.Stream()

function inspect( object ) {
  process.stdout.write( '\n' )
  process.stdout.write(
    require( 'util' ).inspect( object, {
      colors: true,
      depth: null,
      showHidden: true
    })
  )
}

// inspect( encoder )
// inspect( decoder )

bencoder.on( 'readable', function( chunk ) {
  while( chunk = bencoder.read() ) {
    console.log( 'out::readable', chunk )
  }
})

var rs = fs.createReadStream( TORRENT_FILE )
var ps = new Stream.PassThrough()
  .on( 'data', function( chunk ) {
    console.log( 'out::buffer', chunk )
  })

rs.pipe( bencoder )
  .pipe( ps )
// bencoder.pipe( ps )

bencoder.write({ hello: 'world' })
