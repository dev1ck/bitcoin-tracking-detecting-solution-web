import { NextResponse } from "next/server";
import axios from "axios";
import Profile from "@/models/Profile";
import Cluster from "@/models/Cluster";
import dbConnect from "@/utils/dbConnect";
import BlockchainApi from "@/types/blockchain_api/index";
import WalletInfo from "@/types/blockchain_api/wallet_info";

export async function GET(
  request: Request,
  { params }: { params: { addr: string } },
) {
  try {
    const rawData = (
      await axios(`https://blockchain.info/rawaddr/${params.addr}`)
    ).data;
    await dbConnect();
    const result = await processingWalletInfo(rawData, rawData.address);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { error: `${params.addr} is Not Found` },
      { status: 404 },
    );
  }
}

async function processingWalletInfo(rawData: any, addr: string) {
  const txs = rawData.txs;
  const result: BlockchainApi.Wallet = {
    addr,
    balance: rawData.final_balance,
    n_tx: rawData.n_tx,
    n_rcv_tx: 0,
    n_sent_tx: 0,
    total_received: rawData.total_received,
    total_sent: rawData.total_sent,
    first_seen_receiving: 0,
    last_seen_receiving: 0,
    first_seen_sending: 0,
    last_seen_sending: 0,
    txs: [],
    cluster: await getClusterInfo(addr),
    profile: await getProfileInfo(addr),
  };

  result.txs = txs.map((tx: any) => {
    let newTx: WalletInfo.Txs = {
      txid: tx.hash,
      value: 0,
      fee: tx.fee,
      time: tx.time,
      is_rcv: true,
    };

    for (let input of tx.inputs) {
      if (input.prev_out.addr === addr) {
        newTx.is_rcv = false;
        result.n_sent_tx++;
        if (result.last_seen_sending === 0) result.last_seen_sending = tx.time;
        result.first_seen_sending = tx.time;
        break;
      }
    }

    if (newTx.is_rcv) {
      result.n_rcv_tx++;
      if (result.last_seen_receiving === 0)
        result.last_seen_receiving = tx.time;
      result.first_seen_receiving = tx.time;
      tx.out.map((out: any) => {
        if (out.addr === addr) newTx.value += out.value;
      });
    } else {
      tx.inputs.map((input: any) => {
        if (input.prev_out.addr === addr) newTx.value += input.prev_out.value;
      });
    }

    return newTx;
  });

  return result;
}

async function getClusterInfo(addr: string) {
  const res = await Cluster.findOne({ address: addr });
  if (res) {
    let cluster: WalletInfo.Cluster = {
      _id: res._id,
      n_addr: res.address.length,
      name: res.name,
    };
    return cluster;
  }
  return undefined;
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
