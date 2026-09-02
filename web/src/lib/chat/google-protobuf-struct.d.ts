// google-protobuf ships no type declarations of its own (the generated
// conversation_pb.d.ts imports this same module, but skipLibCheck exempts .d.ts
// files from resolution errors - a plain .ts source file like client.ts isn't
// exempt). Scoped to only what client.ts actually calls.
declare module 'google-protobuf/google/protobuf/struct_pb' {
  export class Struct {
    static fromJavaScript(obj: Record<string, unknown>): Struct
    toJavaScript(): Record<string, unknown>
  }
}
