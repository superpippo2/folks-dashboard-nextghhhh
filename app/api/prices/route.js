import { Indexer } from "algosdk";
import { getOraclePrices, MainnetOracle, MainnetPools } from "@folks-finance/algorand-sdk";

const ASSETS = {
  ALGO:   { assetId: 0,          decimals: 6 },
  xALGO:  { assetId: 1134696561, decimals: 6 },
  USDC:   { assetId: 31566704,   decimals: 6 },
  goBTC:  { assetId: 386192725,  decimals: 8 },
  goETH:  { assetId: 386195940,  decimals: 8 },
  WBTC:   { assetId: 1058926737, decimals: 8 },
  WETH:   { assetId: 887406851,  decimals: 8 },
  GOLD:   { assetId: 246516580,  decimals: 6 },
  SILVER: { assetId: 246519683,  decimals: 6 },
  TINY:   { assetId: 2200000000, decimals: 6 },
  FOLKS:  { assetId: 3203964481, decimals: 6 },
};

export async function GET() {
  try {
    const indexer = new Indexer("", "https://mainnet-idx.algonode.cloud", 443);
    const oraclePrices = await getOraclePrices(indexer, MainnetOracle);
    const oracleDec = MainnetOracle.decimals; // 14

    const prices = {};
    for (const [name, { assetId, decimals }] of Object.entries(ASSETS)) {
      const entry = oraclePrices.prices[assetId];
      if (entry) {
        const divisor = Math.pow(10, oracleDec - decimals);
        prices[name] = Number(entry.price) / divisor;
      } else {
        prices[name] = 0;
      }
    }
    prices["ISO ALGO"]  = prices["ALGO"];
    prices["ISO USDC"]  = prices["USDC"];
    prices["ISO TINY"]  = prices["TINY"] ?? 0;
    prices["ISO FOLKS"] = prices["FOLKS"] ?? 0;

    return Response.json({ success: true, prices });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}