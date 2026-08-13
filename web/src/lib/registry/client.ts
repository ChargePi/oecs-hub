import { GrpcRegistryClient } from './grpc-client'
import type { RegistryClient } from './types'

/**
 * The single registry client instance the app talks to. Every caller depends on the
 * RegistryClient interface, not GrpcRegistryClient directly.
 */
export const registryClient: RegistryClient = new GrpcRegistryClient()
