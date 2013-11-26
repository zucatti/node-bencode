/**
 * Encodes data in bencode.
 *
 * @param  {Buffer|Array|String|Object|Number} data
 * @return {Buffer}
 */
function encode( data ) {
  var buffers = []
  encode._encode( buffers, data )
  return Buffer.concat( buffers )
}

encode._encode = function( buffers, data ) {
  
  if( data instanceof Buffer ) {
    buffers.push(new Buffer(data.length + ':'))
    buffers.push(data)
    return;
  }
  
  switch( typeof data ) {
    case 'string':
      encode.bytes( buffers, data )
      break
    case 'number':
      encode.number( buffers, data )
      break
    case 'object':
      data.constructor === Array
        ? encode.list( buffers, data )
        : encode.dict( buffers, data )
      break
  }
}

var buff_e = new Buffer('e')
  , buff_d = new Buffer('d')
  , buff_l = new Buffer('l')

encode.bytes = function( buffers, data ) {
  var length = Buffer.byteLength( data ).toString()
  buffers.push( new Buffer( length + ':' + data ) )
}

encode.number = function( buffers, data ) {
  var number = ( data >>> 0 ).toString()
  this.push( new Buffer( 'i' + number + 'e' ) )
}

encode.dict = function( buffers, data ) {
  
  buffers.push( buff_d )
  
  // fix for issue #13 - sorted dicts
  var keys = Object.keys( data ).sort()
  var j, k, kl = keys.length
  
  for( j = 0; j < kl ; j++) {
    k=keys[j]
    encode.bytes( buffers, k )
    encode._encode( buffers, data[k] )
  }
  
  buffers.push( buff_e )
  
}

encode.list = function( buffers, data ) {
  
  buffers.push( buff_l )
  
  var i, c = data.length
  for( i = 0; i < c; i++ ) {
    encode._encode( buffers, data[i] )
  }
  
  buffers.push( buff_e )
  
}

// Expose
module.exports = encode
