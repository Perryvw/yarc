// Required for TS to understand import of proto files for vite to include the files in the output
declare module "*.proto?asset" {
    const src: string;
    export default src;
}
