import BlockchainApi from "@/types/blockchain_api/index";
import Cluster from "@/models/Cluster";
import dbConnect from "@/utils/dbConnect";
import { NextResponse } from "next/server";
import axios from "axios";
import Profile from "@/models/Profile";

export async function GET(
  request: Request,
  { params }: { params: { name: string } },
) {
  let rawData;
  await dbConnect();
  if (params.name.match(/^[0-9a-fA-F]{24}$/))
    rawData = await Cluster.findById(params.name);
  else rawData = await Cluster.findOne({ name: params.name });

  if (rawData) {
    try {
      const result: BlockchainApi.Cluster = {
        _id: rawData.id,
        name: rawData.name,
        n_wallet: rawData.address.length,
        constructor: rawData.metadata.constructor,
        date_created: rawData.metadata.date_created,
        date_last_modified: rawData.metadata.date_last_modified,
        last_modifier: rawData.metadata.last_modifier,
        wallet: await getWalletInfo(rawData.address),
        profile: await getProfileInfo(rawData.id),
      };

      return NextResponse.json(result);
    } catch (err) {
      return NextResponse.json({ error: err, status: 500 });
    }
  } else {
    return NextResponse.json(
      { error: `${params.name} is Not Found` },
      { status: 404 },
    );
  }
}

async function getWalletInfo(addrs: string[]): Promise<
  {
    addr: string;
    balance: number;
  }[]
> {
  const promises = addrs.map((addr) => {
    return axios(`https://blockchain.info/rawaddr/${addr}`);
  });
  const axiosData = await Promise.all(promises);
  return axiosData.map((rawData) => {
    return {
      addr: rawData.data.address,
      balance: rawData.data.final_balance,
    };
  });
}

async function getProfileInfo(id: string) {
  const res = await Profile.findOne({ target: id });
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
