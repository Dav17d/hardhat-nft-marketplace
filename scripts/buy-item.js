const { ethers, getChainId } = require("hardhat")
const { moveBlocks, sleep } = require("../utils/move-blocks")

const TOKEN_ID = 6

async function buyItem() {
    const nftMarketplace = await ethers.getContract("NftMarketplace")
    const basicNft = await ethers.getContract("BasicNft")
    const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
    const price = listing.price.toString()
    const tx = await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: price })
    await tx.wait(1)
    console.log("Bought NFT!")
    if ((await getChainId()) == "31337") {
        await moveBlocks(1, (sleepAmount = 1000))
    }
}

buyItem()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
