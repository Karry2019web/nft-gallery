import type { NFT, NFTMetadata } from '@/types'
import { sanitizeIpfsUrl } from '@/utils/ipfs'
import type { BaseNFTMeta } from '@/components/base/types'
import { fetchOdaToken } from '@/services/oda'

type baseMimeType = {
  imageMimeType?: string
  animationUrlMimeType?: string
}

export type NFTWithMetadata = NFT &
  NFTMetadata & { meta: BaseNFTMeta } &
  baseMimeType

export type MinimalNFT = {
  id: string
  name: string
  sn?: string
  description?: string
  metadata: string
  meta: BaseNFTMeta
}

export type TokenEntity = {
  id: string
  name: string
  image: string
  media?: string
  metadata: string
  meta: BaseNFTMeta
  supply: number
  cheapest: {
    id: string
    price: string
    currentOwner: string
  }
  collection: {
    id: string
    name: string
    floorPrice: [{ price: string }]
  }
  sn?: string
}

export type NFTOffer = {
  id: string
  price: string
  expiration: number
  status: string
}

export const isTokenEntity = (
  entity: NFTWithMetadata | TokenEntity,
): entity is TokenEntity =>
  typeof (entity as TokenEntity).supply !== 'undefined'

function getAttributes(nft, metadata) {
  const hasMetadataAttributes
    = metadata.attributes && metadata.attributes.length > 0

  // Merge attributes: on-chain (extrinsic) attributes overwrite metadata attributes
  // when they share the same trait_type or key
  const toKeyedObject = (attrs) => {
    if (!attrs) { return {} }
    const obj = {}
    for (const attr of attrs) {
      obj[attr.trait_type || attr.key] = attr
    }
    return obj
  }

  const metadataAttrs = nft?.meta?.attributes || []
  const onChainAttrs = nft?.attributes || []
  const merged = { ...toKeyedObject(metadataAttrs), ...toKeyedObject(onChainAttrs) }
  const attr = Object.values(merged)

  const hasEmptyNftAttributes = attr.length === 0

  return hasMetadataAttributes && hasEmptyNftAttributes
    ? metadata.attributes
    : attr
}

async function getMetadata(nft) {
  const { urlPrefix } = usePrefix()
  const getMetadata = await fetchOdaToken(urlPrefix.value, nft.collection.id, nft.sn)
  const metadata = getMetadata.metadata

  return {
    ...nft,
    image: metadata.image,
    animationUrl: metadata.animation_url,
    meta: {
      image: metadata.image,
      animationUrl: metadata.animation_url,
    },
  }
}

export async function getNftMetadata<T extends NFTWithMetadata>(
  nft: T,
) {
  if (!nft.meta?.image) {
    // get metadata from onchain
    return await getMetadata(nft)
  }

  // return metadata from indexer
  const name = nft.name || nft.meta.name
  const description = nft.description || nft.meta.description
  const image = sanitizeIpfsUrl(nft.meta.image)
  const animationUrl = sanitizeIpfsUrl(
    nft.meta.animation_url || nft.meta.animationUrl || '',
  )
  const type = nft.meta.type

  return {
    ...nft,
    name,
    description,
    image,
    animationUrl,
    type: type || '',
    attributes: getAttributes(nft, nft.metadata || nft.meta),
  }
}
