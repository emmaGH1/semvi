// Minimal CBOR decoder (RFC 8949) for Ootle substates: ints, bytes, text, arrays, maps, tags, simple.
export function decodeCbor(bytes){
  let i=0;const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const len=ai=>{if(ai<24)return ai;if(ai===24)return bytes[i++];if(ai===25){const v=dv.getUint16(i);i+=2;return v}if(ai===26){const v=dv.getUint32(i);i+=4;return v}if(ai===27){const v=dv.getBigUint64(i);i+=8;return v<=BigInt(Number.MAX_SAFE_INTEGER)?Number(v):v}throw Error('Indefinite CBOR unsupported')};
  const item=()=>{const b=bytes[i++],mt=b>>5,ai=b&31;
    switch(mt){case 0:return len(ai);case 1:{const n=len(ai);return typeof n==='bigint'?-1n-n:-1-n}
      case 2:{const n=len(ai);const v=bytes.slice(i,i+n);i+=n;return v}
      case 3:{const n=len(ai);const v=new TextDecoder().decode(bytes.subarray(i,i+n));i+=n;return v}
      case 4:{const n=len(ai);return Array.from({length:n},item)}
      case 5:{const n=len(ai);const m=new Map();for(let k=0;k<n;k++){const key=item();m.set(key instanceof Uint8Array?hex(key):key,item())}return m}
      case 6:{const tag=len(ai);return {tag,value:item()}}
      case 7:{if(ai===20)return false;if(ai===21)return true;if(ai===22||ai===23)return null;throw Error('Unsupported simple '+ai)}}};
  return item();
}
export const hex=b=>[...b].map(x=>x.toString(16).padStart(2,'0')).join('');
