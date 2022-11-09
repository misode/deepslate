# NbtChunk

## Creating an NbtChunk
Most like you will be getting chunks through an [`NbtRegion`](../region), but you can also create them separately.
```ts
const file = NbtFile.create()
const chunk = NbtChunk.create(3, 4, file)
```

## Properties
|Name         |Type    |
|-------------|--------|
|`x`          |`number`|
|`z`          |`number`|
|`compression`|`number`|
|`timestamp`  |`number`|

## Methods

### `getCompression()` {#getCompression}
Returns the string representation of the compression. Throws if the chunk has an invalid compression mode.

|Number|String|
|------|------|
|`1`   |`gzip`|
|`2`   |`zlib`|
|`3`   |`none`|

### `setCompression(compression)` {#setCompression}
Sets this chunk's compression number corresponding to the the passed string. See the table above for the conversion. Throws if compression is an invalid compression mode.

### `getFile()` {#getFile}
Returns the [`NbtFile`](../file). If this is the first time, it reads it from the raw data.

### `getRoot()` {#getRoot}
Returns the root [`NbtCompound`](../type/compound) from the file. Equivalent to `chunk.getFile().root`.

### `setRoot(root)` {#setRoot}
Sets the file's root and marks this chunk as dirty.

### `markDirty()` {#markDirty}
Marks this chunk as dirty. You need to call this whenever you make changes to the chunk's `root`.

### `getRaw()` {#getRaw}
Returns the raw `Uint8Array` data of the chunk. If the chunk is dirt, the file will be written first, and then the file will be marked as not dirty.

### `toJson()` {#toJson}
Serializes the chunk to a format which can be represented by JSON. This can be necessary when using workers.

```ts
const json = chunk.toJson()
// send the data to a different worker
const chunk2 = NbtChunk.fromJson(json, chunkResolver)
```

:::info
For performance reasons, the serialized data does not contain the raw chunk data. The chunk obtained from `NbtChunk.fromJson` returns an [`NbtChunk.Ref`](#Ref). `chunkResolver` is necessary to asynchronously request the data of a chunk.
:::

## `NbtChunk.Ref` {#Ref}

### Properties
|Name         |Type    |
|-------------|--------|
|`x`          |`number`|
|`z`          |`number`|
|`compression`|`number`|
|`timestamp`  |`number`|
|`size`       |`number`|
|`resolver`   |`(x: number, z: number) => Promise<NbtFile>`|

### Methods

#### `getFile()` {#Ref.getFile}
Returns the [`NbtFile`](../file) or `undefined` if the chunk hasn't been resolved yet.

#### `getRoot()` {#Ref.getRoot}
Returns the root [`NbtCompound`](../type/compound) of the file or `undefined` if the chunk hasn't been resolved yet.

#### `getFileAsync()` {#Ref.getFileAsync}
Returns a promise to the [`NbtFile`](../file).

#### `getRootAsync()` {#Ref.getRootAsync}
Returns a promise to the root [`NbtCompound`](../type/compound) of the file.

#### `isResolved()` {#Ref.isResolved}
Returns a boolean indicating whether the ref is resolved yet.
