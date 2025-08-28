type ProtoObject = ProtoMessageDescriptor | ProtoRepeated | ProtoOneOf | ProtoLiteral | ProtoOptional | ProtoEnum;

interface ProtoMessageDescriptor {
    type: "message";
    name: string;
    fields: Record<string, ProtoField | undefined>;
}

interface ProtoRepeated {
    type: "repeated";
    repeatedType: ProtoObject;
}

interface ProtoOneOf {
    type: "oneof";
    fields: Record<string, ProtoObject>;
}

interface ProtoLiteral {
    type: "literal";
    literalType: string;
}

interface ProtoOptional {
    type: "optional";
    optionalType: ProtoObject;
}

interface ProtoEnum {
    type: "enum";
    name: string;
    values: Array<{ value: number; name: string }>;
}

interface ProtoField {
    id: number;
    name: string;
    type: ProtoObject;
}
