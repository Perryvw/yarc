type ProtoObject = ProtoMessageDescriptor | ProtoRepeated | ProtoOneOf | ProtoLiteral | ProtoOptional | ProtoEnum;

interface ProtoMessageDescriptor {
    type: "message";
    name: string;
    fields: Record<string, ProtoObject | undefined>;
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
    values: string[];
}
