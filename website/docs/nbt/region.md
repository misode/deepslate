# NbtRegion

## Creating an NbtRegion
After obtaining a `Uint8Array` of the region file, you can give it to `NbtRegion.read` to create an `NbtRegion`. This will read the region file header, but it won't read any chunks yet.
```ts
const response = await fetch('./r.0.0.mca')
const arrayBuffer = await response.arrayBuffer()
const region = NbtRegion.read(new Uint8Array(arrayBuffer, {}))
```

## Methods

### `getChunkPositions()` {#getChunkPositions}
Returns a list of the position of each chunk, relative to the region (so the `x` and `z` coordinates will always be between `0` and `31` inclusive).

```ts
const chunks = region.getChunkPositions()
console.log(chunks) // [[0, 0], [0, 1], [0, 2], [6, 3], [6, 4]]
```

### `getChunk(index)` {#getChunk}
Returns the [`NbtChunk`](../chunk) by index, or `undefined` if the chunk doesn't exist.

### `findChunk(x, z)` {#findChunk}
Returns the [`NbtChunk`](../chunk) by its `x` and `z` coordinates (region relative), or `undefined` if the chunk doesn't exist.

### `getFirstChunk()` {#getFirstChunk}
Returns the first [`NbtChunk`](../chunk) in the region, or `undefined` if this region is completely empty.

### `filter(predicate)` {#filter}
Returns a filtered list of [`NbtChunk`](../chunk) using a predicate. Chunks that are `undefined` are not checked by the predicate and are filtered out.

```ts
const chunks = region.filter(chunk => chunk.x === 0)
```

### `map(mapper)` {#map}
Returns a mapped list of [`NbtChunk`](../chunk) using a mapper function.  Chunks that are `undefined` are not mapped and are filtered out.

```ts
const compressions = new Set(region.map(chunk => chunk.compression))
if (compressions.size > 1) {
	console.log('Region has mixed compression!')
}
```

### `write()` {#write}
Turns this region into a `Uint8Array`.

```ts
const array = region.write()
```

### `toJson()` {#toJson}
Serializes the region to a format which can be represented by JSON. This can be necessary when using workers.

```ts
const json = region.toJson()
// send the data to a different worker
const region2 = NbtRegion.fromJson(json, chunkResolver)
```

:::info
For performance reasons, the serialized data does not contain the raw chunk data. The region obtained from `NbtRegion.fromJson` returns an [`NbtRegion.Ref`](#Ref). `chunkResolver` is necessary to asynchronously request the data of a chunk.
:::

## `NbtRegion.Ref` {#Ref}
A region ref acts very similar to a normal `NbtRegion`, most notable changes:
* Instead of working with [`NbtChunk`](../chunk), it uses [`NbtChunk.Ref`](../chunk/#Ref).
* It does not have the`write()` or `toJson()` methods.
