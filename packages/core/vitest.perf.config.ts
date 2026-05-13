export default {
  test: {
    environment: "jsdom",
    globals: true,
    include: ["perf/**/*.bench.ts"],
  },
};
