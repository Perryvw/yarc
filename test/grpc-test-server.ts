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

interface HelloResponse {
    message: string;
}

const server = new grpc.Server();
server.addService(greeterService.service, {
    SayHello: (call: grpc.ServerWritableStream<HelloRequest, HelloResponse>) => {
        console.log("handling unary request");
        call.write({ message: `Hello ${call.request.name}!` });
        call.end();
    },
    StreamHello: (call: grpc.ServerWritableStream<HelloRequest, HelloResponse>) => {
        const maxCount = 10;
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
        send();
    },
});

// Start server, will block process
server.bindAsync(SERVER_ADDRESS, grpc.ServerCredentials.createInsecure(), () => {
    console.log(`Server started at ${SERVER_ADDRESS}`);
});
