declare global {
  interface Global {
    callAI: (args: {
      model: string;
      prompt: string;
      agentId: string;
      compensation: any;
    }) => Promise<{ output: string }>;
  }

  // For environments where globalThis is the same as Global
  // (Node 18+, Bun, etc.)
  var callAI: Global["callAI"];
}

export {};
