// If you want you can run this test server with `npx tsx test/grpc-test-server.ts`

import * as grpc from "@grpc/grpc-js";
import * as proto from "@grpc/proto-loader";

const SERVER_ADDRESS = "0.0.0.0:50051";

const protoFile = `${__dirname}/protos/myproto.proto`;
const packageDescriptor = proto.loadSync(protoFile);

const descriptor = grpc.loadPackageDefinition(packageDescriptor);
const greeterService = (descriptor.greet as grpc.GrpcObject).Greeter as grpc.ServiceClientConstructor;

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
    SayHello: (call: grpc.ServerWritableStream<HelloRequest, HelloReply>) => {
        console.log("handling unary request");
        call.write({ message: `Hello ${call.request.name}!` });
        call.end();
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
    TestNested: (call: grpc.ServerWritableStream<NestedRequest, HelloReply>) => {
        call.write({ message: JSON.stringify(call.request) });
        call.end();
    },
    TestGetStringList: (call: grpc.ServerWritableStream<HelloRequest, StringListReply>) => {
        call.write({
            values: [
                "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
                "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
                "ccccccccccccccccccccccc",
            ],
        });
        call.end();
    },
});

// Start server, will block process
server.bindAsync(SERVER_ADDRESS, grpc.ServerCredentials.createInsecure(), () => {
    console.log(`Server started at ${SERVER_ADDRESS}`);
});
