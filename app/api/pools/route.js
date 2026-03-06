import { Indexer } from "algosdk";
import {
  retrievePoolInfo,
  MainnetPools,
} from "@folks-finance/algorand-sdk";

const ONE_14_DP = 100000000000000;

function toAPY(bigint) {
  return Number(bigint) / ONE_14_DP;
}

function toAmount(bigint, decimals) {
  return Number(bigint) / Math.pow(10, decimals);
}

const POOLS_TO_FETCH = ["ALGO", "xALGO", "USDC", "goBTC", "goETH", "WBTC", "WETH", "GOLD", "SILVER"];
const ISOLATED = ["ISOLATED_ALGO", "ISOLATED_USDC", "ISOLATED_TINY", "ISOLATED_FOLKS"];

export async function GET() {
  try {
    const indexer = new Indexer("", "https://mainnet-idx.algonode.cloud", 443);

    const results = await Promise.all(
      [...POOLS_TO_FETCH, ...ISOLATED].map(async (key) => {
        const pool = MainnetPools[key];
        if (!pool) return null;
        const info = await retrievePoolInfo(indexer, pool);
        const dec = pool.assetDecimals ?? 6;
        return {
          key,
          depositAPY:    toAPY(info.interest.depositInterestYield),
          varBorrowAPY:  toAPY(info.variableBorrow.variableBorrowInterestYield),
          stblBorrowAPY: toAPY(info.stableBorrow.stableBorrowInterestYield),
          totalDeposits: toAmount(info.interest.totalDeposits, dec),
          totalBorrow:   toAmount(
            info.variableBorrow.totalVariableBorrowAmount + info.stableBorrow.totalStableBorrowAmount, dec
          ),
          borrowCap:     toAmount(info.caps.borrowCap, dec),
        };
      })
    );

    return Response.json({ success: true, data: results.filter(Boolean) });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
}