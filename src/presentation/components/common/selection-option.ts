export type SelectionOption<Value extends string> = Readonly<{
  value: Value;
  label: string;
  description?: string;
}>;
