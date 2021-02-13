export interface BlockPropertiesProvider {
    getBlockProperties(id: string | undefined): BlockProperties | null
}

export type BlockProperties = {
    opaque?: boolean
}