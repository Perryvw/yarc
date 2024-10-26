const ElectronPlugin = {
    name: "example",
    setup(build) {
        build.onResolve({ filter: /^electron$/ }, async () => {
            return { path: "electron", external: true }; // Do not resolve electron in UI
        });
    },
};

export const esBuildSettings = {
    entryPoints: ["src/react-app.ts"],
    bundle: true,
    outdir: "out",
    sourcemap: true,
    plugins: [ElectronPlugin],
};
