// google-protobuf ships no type declarations of its own (the generated registry_pb.d.ts
// imports this same module, but skipLibCheck exempts .d.ts files from resolution errors -
// a plain .ts source file like grpc-client.ts isn't exempt). Scoped to only what
// grpc-client.ts actually calls.
declare module 'google-protobuf/google/protobuf/empty_pb' {
  export class Empty {
    serializeBinary(): Uint8Array
  }
}
