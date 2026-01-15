export const LEX_REGIONS = [
  { value: "us-east-1", label: "US East (N. Virginia)" },
  { value: "us-west-2", label: "US West (Oregon)" },
  { value: "eu-west-1", label: "Europe (Ireland)" },
  { value: "eu-west-2", label: "Europe (London)" },
  { value: "eu-central-1", label: "Europe (Frankfurt)" },
  { value: "ap-southeast-1", label: "Asia Pacific (Singapore)" },
  { value: "ap-southeast-2", label: "Asia Pacific (Sydney)" },
  { value: "ap-northeast-1", label: "Asia Pacific (Tokyo)" },
  { value: "ap-northeast-2", label: "Asia Pacific (Seoul)" },
  { value: "ca-central-1", label: "Canada (Central)" },
  { value: "af-south-1", label: "Africa (Cape Town)" },
] as const;

export type LexRegion = (typeof LEX_REGIONS)[number]["value"];

export const LEX_REGION_VALUES = LEX_REGIONS.map((r) => r.value) as [
  LexRegion,
  ...LexRegion[],
];
