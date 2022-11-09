# NbtTag
Abstract class used by all the [NBT types](../type)

## Methods

### `isEnd()` {#isEnd}
Whether this tag is of type `End`.

A method exists for each type. They are excluded from the docs for brevity.

### `isNumber()` {#isNumber}
Whether this tag is a byte, short, int, long, float or double.

### `isArray()` {#isArray}
Whether this tag is a bytearray, intarray or longarray.

### `isListOrArray()` {#isListOrArray}
Whether this tag is a list, bytearray, intarray or longarray.

### `getAsNumber()` {#getAsNumber}
Returns the `number` representation of this tag. If this is not a number, returns `0`.

### `getAsString()` {#getAsNumber}
Returns the `string` representation of this tag. If this is not a string, returns `''`.

### `getId()` {#getId}
Returns the [`NbtType`](../type) of this tag.

### `toString()` {#toString}
Returns the compact SNBT representation of this tag.

### `toPrettyString(indent, depth)` {#toPrettyString}
Returns the compact SNBT representation of this tag. `indent` is the indentation string for each level, it defaults to two spaces. `depth` is the current level, it defaults to `0`.

### `toJson()` {#toJson}
Serializes the tag to a format which can be represented by JSON. This can be necessary when using workers.

### `toJsonWithId()` {#toJsonWithId}
Serializes the tag to a format which can be represented by JSON, also including the ID.

### `toBytes(output)` {#toBytes}
Writes the bytes of this tag to the [`DataOutput`](../dataoutput).

## Static methods

### `create(id)`: {#create}
Creates an `NbtTag` of a certain type with default values.

### `fromString(input)` {#fromString}
Parses an SNBT string to get an NbtTag. `input` can be either a `string` or a `StringReader`.

### `fromJson(value, id)` {#fromJson}
Turns the serialized format created by [`toJson()`](#toJson) back into an `NbtTag`.

### `fromJsonWithId(value)` {#fromJsonWithId}
Turns the serialized format created by [`toJsonWithId()`](#toJsonWithId) back into an `NbtTag`.

### `fromBytes(input, id)` {#fromBytes}
Reads the bytes from the [`DataInput`](../datainput) to create an `NbtTag`. `id` defaults to a compound if not given.
