# NbtFile

## Creating an NbtFile
After obtaining a `Uint8Array` of the file, you can give it to `NbtFile.read` to create an `NbtFile`.
```ts
const response = await fetch('./example.nbt')
const arrayBuffer = await response.arrayBuffer()
const file = NbtFile.read(new Uint8Array(arrayBuffer, {}))
```
Alternatively, empty files can be created with `NbtFile.create`.
```ts
const file = NbtFile.create({})
```

### Options
In both cases, you can pass an options argument. For each options property, if it is not given `NbtFile.read` will try to detect it from the binary data. `littleEndian` is not automatically detected, it always defaults to `false`.

|Name           |Type                                           |Default    |
|---------------|-----------------------------------------------|-----------|
|`name`         |`string`                                       |`''`       |
|`compression`  |<code>'gzip' &#124; 'zlib' &#124; 'none'</code>|`none`     |
|`littleEndian` |`boolean`                                      |`false`    |
|`bedrockHeader`|<code>number &#124; boolean</code>             |`undefined`|

## Properties
|Name           |Type                                           |
|---------------|-----------------------------------------------|
|`name`         |`string`                                       |
|`root`         |[`NbtCompound`](../type/compound)              |
|`compression`  |<code>'gzip' &#124; 'zlib' &#124; 'none'</code>|
|`littleEndian` |`boolean`                                      |
|`bedrockHeader`|<code>number &#124; undefined</code>           |

## Methods

### `write()` {#write}
Turns this file into a `Uint8Array`. Writes the `bedrockHeader` if not `undefined`. Compresses the data if `compression` is not `'none'`.

```ts
const array = file.write()
```

### `toJson()` {#toJson}
Serializes the file to a format which can be represented by JSON. This can be necessary when using workers.

```ts
const json = file.toJson()
// send the data to a different worker
const file2 = NbtFile.fromJson(json)
```
