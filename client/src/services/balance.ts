import { RPC_URL, ETH_CONTRACT } from '../constants';

// selector for "balanceOf" = starknet_keccak("balanceOf")
const BALANCE_OF_SELECTOR =
  '0x2e4263afad30923c891518314c3c95dbe830a16874e8abc5777a9a20b54c76e';

export async function fetchEthBalance(address: string): Promise<string> {
  const response = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'starknet_call',
      params: {
        request: {
          contract_address: ETH_CONTRACT,
          entry_point_selector: BALANCE_OF_SELECTOR,
          calldata: [address],
        },
        block_id: 'latest',
      },
      id: 1,
    }),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'RPC error');
  }

  // u256 result: [low, high]
  const low = BigInt(data.result[0]);
  const high = BigInt(data.result[1]);
  const balance = (high << 128n) + low;
  const ethBalance = Number(balance) / 1e18;

  return ethBalance.toFixed(6);
}
