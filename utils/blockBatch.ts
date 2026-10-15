// ABOUTME: Creates a batch of blocks and preserves their input order.
// ABOUTME: Keeps each block's database transaction from overlapping the next.
export async function createBlockBatch<Block, Result>(
  blocks: Block[],
  createBlock: (block: Block) => Promise<Result>,
): Promise<Result[]> {
  const results: Result[] = [];
  for (const block of blocks) {
    results.push(await createBlock(block));
  }
  return results;
}
