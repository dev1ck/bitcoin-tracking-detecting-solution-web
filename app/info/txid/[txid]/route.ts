import { NextResponse } from "next/server";
import BlockchainApi from "@/types/blockchain_api/index";
import dbConnect from "@/utils/dbConnect";
import Profile from "@/models/Profile";
import { getBlock, getRawTransaction, getTxOut } from "@/utils/bitcoinCore";

export async function GET(
  request: Request,
  { params }: { params: { txid: string } },
) {
  try {
    await dbConnect();
    const coreData = await getRawTransaction(params.txid);
    const blockHeight = (await getBlock(coreData.blockhash)).height;
    const result = await processTx(coreData, blockHeight);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: `${params.txid} is Not Found` },
      { status: 404 },
    );
  }
}
async function processTx(rawData: any, blockHeight: number) {
  const result: BlockchainApi.TxHash = {
    txid: rawData.txid,
    n_input: rawData.vin.length,
    n_output: rawData.vout.length,
    input_value: 0,
    output_value: 0,
    fee: 0,
    block_hash: rawData.blockhash,
    block_height: blockHeight,
    size: rawData.size,
    time: rawData.time,
    ver: rawData.version,
    lock_time: rawData.locktime,
    inputs: [],
    outputs: [],
    profile: await getProfileInfo(rawData.txid),
  };
  const inputPromises = rawData.vin.map((vin: any, index: number) => {
    return processInput(vin, result, index);
  });
  const outPromises = rawData.vout.map((vout: any) => {
    return processOutput(vout, result);
  });
  result.inputs = await Promise.all(inputPromises);
  result.outputs = await Promise.all(outPromises);
  result.fee =
    result.input_value === 0 ? 0 : result.input_value - result.output_value;

  return result;
}

async function processInput(
  vin: any,
  result: BlockchainApi.TxHash,
  index: number,
) {
  if (vin.hasOwnProperty("coinbase")) {
    return {
      coinbase: vin.coinbase,
      sequence: vin.sequence,
    };
  }
  const prevData: any = await getRawTransaction(vin.txid);
  result.input_value += prevData.vout[vin.vout].value;
  return {
    sequence: vin.sequence,
    txid: vin.txid,
    n: index,
    prev_out: {
      addr: prevData.vout[vin.vout].scriptPubKey.address || "Unknown",
      value: prevData.vout[vin.vout].value,
    },
  };
}

async function processOutput(vout: any, result: BlockchainApi.TxHash) {
  const res: any = {
    addr: vout.scriptPubKey.address || "Unknown",
    value: vout.value,
    n: vout.n,
  };
  if (await getTxOut(result.txid, vout.n)) {
    res.spent = false;
  } else {
    res.spent = true;
  }
  result.output_value += vout.value;

  return res;
}

async function getProfileInfo(addr: string) {
  const res = await Profile.findOne({ target: addr });
  if (res) {
    const profile: BlockchainApi.Profile = {
      entities: res.entities,
      comment: res.comment,
      flags: res.flags,
    };
    return profile;
  }
  return undefined;
}
