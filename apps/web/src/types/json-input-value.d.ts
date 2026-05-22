type JsonInputPrimitive = string | number | boolean | null;
type JsonInputValue = JsonInputPrimitive | JsonInputObject | JsonInputArray;

type JsonInputObject = Record<string, JsonInputValue>;
type JsonInputArray = JsonInputValue[];
