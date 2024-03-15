import { orders as fujiOrders } from "./fixtures-fuji";
import { orders as goerliOrders } from "./fixtures-goerli";
import { orders as arbitrumOrders } from "./fixtures-arbitrum";

const fixturesByNetworkName = new Map<string, Map<string, string>>();

fixturesByNetworkName.set("avalanche", new Map<string, string>());
fixturesByNetworkName.set("arbitrum-one", arbitrumOrders);
fixturesByNetworkName.set("arbitrum-goerli", goerliOrders);
fixturesByNetworkName.set("fuji", fujiOrders);

export default fixturesByNetworkName;
