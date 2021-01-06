declare module 'nbt' {

  type NbtTag = {
    type: 'byte' | 'short' | 'int' | 'float' | 'double'
    value: number
  } | {
    type: 'long'
    value: [number, number]
  } | {
    type: 'byteArray' | 'intArray'
    value: number[]
  } | {
    type: 'longArray'
    value: [number, number][]
  } | {
    type: 'string'
    value: string
  } | {
    type: 'list'
    value: {
      type: string
      value: any[]
    }
  } | {
    type: 'compound'
    value: {
      [name: string]: NbtTag
    }
  }

  type NamedNbtTag = {
    name: string,
    value: {
      [name: string]: NbtTag
    }
  }

  type ParseCallback = (error: Error | null, value: NamedNbtTag) => void

  /**
   * A mapping from type names to NBT type numbers.
   */
  export const tagTypes: { [name: string]: number }

  /**
   * A mapping from NBT type numbers to type names.
   */
  export const tagTypeNames: { [id: number]: string }

  /**
	 * This accepts both gzipped and uncompressd NBT archives.
	 * If the archive is uncompressed, the callback will be
	 * called directly from this method. For gzipped files, the
	 * callback is async.
	 *
	 * For use in the browser, window.zlib must be defined to decode
	 * compressed archives. It will be passed a Buffer if the type is
	 * available, or an Uint8Array otherwise.
   */
  export function parse(data: ArrayBuffer | Buffer, callback: ParseCallback): void

  export function writeUncompressed(value: NamedNbtTag): ArrayBuffer

  export function parseUncompressed(data: ArrayBuffer): NamedNbtTag

  export function Writer(): Writer

  export function Reader(buffer: ArrayBuffer): Reader

  type Writer = {

    /**
		 * The location in the buffer where bytes are written or read.
		 * This increases after every write, but can be freely changed.
		 * The buffer will be resized when necessary.
     */
    offset: number

    /**
     * Returns the writen data as a slice from the internal buffer,
     * cutting off any padding at the end.
     */
    getData(): ArrayBuffer

    byte(value: number): typeof Writer
    ubyte(value: number): typeof Writer
    short(value: number): typeof Writer
    int(value: number): typeof Writer
    float(value: number): typeof Writer
    double(value: number): typeof Writer
    long(value: [number, number]): typeof Writer
    byteArray(value: number[] | Uint8Array | Buffer): typeof Writer
    intArray(value: number[] | Uint8Array | Buffer): typeof Writer
    longArray(value: [number, number][]): typeof Writer
    string(value: string): typeof Writer
    list(value: { type: string, value: any[] }): typeof Writer
    compound(value: { [key: string]: { type: string, value: any[] } }): typeof Writer
  }

  type Reader = {

    /**
		 * The current location in the buffer. Can be freely changed
		 * within the bounds of the buffer.
		 */
    offset: number

    byte(): number
    ubyte(): number
    short(): number
    int(): number
    float(): number
    double(): number
    long(): [number, number]
    byteArray(): number[]
    intArray(): number[]
    longArray(): [number, number][]
    string(): string
    list(): { type: string, value: any[] }
    compound(): { [key: string]: { type: NbtTag } }
  }
}
