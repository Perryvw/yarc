// If you want you can run this test server with `npx tsx test/grpc-test-server.ts`

import * as grpc from "@grpc/grpc-js";
import * as proto from "@grpc/proto-loader";
import * as protobufjs from "protobufjs";

const SERVER_ADDRESS = "0.0.0.0:50051";

const protoFile = `${__dirname}/protos/myproto.proto`;
const protoPackage = proto.loadSync(protoFile);

const packageDescriptor = grpc.loadPackageDefinition(protoPackage);
const greeterService = (packageDescriptor.greet as grpc.GrpcObject).Greeter as grpc.ServiceClientConstructor;

const protoContent = protobufjs.loadSync(protoFile);

interface HelloRequest {
    name: string;
}

interface HelloReply {
    message: string;
}
interface NestedRequest {
    reply: HelloReply;
    request2?: HelloRequest; // optional

    // oneof request3 reply4
    request3?: HelloRequest;
    reply4?: HelloReply;

    replies?: HelloReply[];
}

interface StringListReply {
    values: string[];
}

const server = new grpc.Server();
server.addService(greeterService.service, {
    SayHello: (call: grpc.ServerUnaryCall<HelloRequest, HelloReply>, callback: grpc.sendUnaryData<HelloReply>) => {
        console.log("handling unary request");
        callback(null, { message: `Hello ${call.request.name}!` });
    },
    StreamHello: (call: grpc.ServerWritableStream<HelloRequest, HelloReply>) => {
        const maxCount = 20;
        let count = 0;
        console.log("handling streaming call");
        function send() {
            if (call.writable) {
                console.log(`writing ${count + 1}/${maxCount}`);
                count++;
                call.write({ message: `Hello ${call.request.name}! (${count}/${maxCount})` });

                if (count < maxCount) {
                    setTimeout(send, 500);
                } else {
                    call.end();
                    console.log("closed stream from server side");
                }
            } else {
                console.log("stream closed from client side");
            }
        }
        setTimeout(send, 3000);
    },
    TestNested: (call: grpc.ServerUnaryCall<NestedRequest, HelloReply>, callback: grpc.sendUnaryData<HelloReply>) => {
        callback(null, { message: JSON.stringify(call.request) });
    },
    TestGetStringList: (
        call: grpc.ServerUnaryCall<HelloRequest, StringListReply>,
        callback: grpc.sendUnaryData<StringListReply>,
    ) => {
        callback(null, {
            values: [
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                "ccccccccccccccccccccccc",
            ],
        });
    },
    ErrorWithTrailers: (call: grpc.ServerUnaryCall<unknown, unknown>, callback: grpc.sendUnaryData<unknown>) => {
        const trailers = new grpc.Metadata();
        trailers.set("plaintext-trailer", "abc");

        const helloReplyType = protoContent.lookupType("greet.HelloReply")!;
        const b = helloReplyType.encode({ message: "hi" }).finish();

        trailers.set("binary-trailer-bin", Buffer.from(b));

        const err = new Error() as unknown as grpc.StatusObject;
        err.code = grpc.status.FAILED_PRECONDITION;
        err.metadata = trailers;
        callback(err);
    },
});

// Start server, will block process
server.bindAsync(SERVER_ADDRESS, grpc.ServerCredentials.createInsecure(), () => {
    console.log(`Server started at ${SERVER_ADDRESS}`);
});
