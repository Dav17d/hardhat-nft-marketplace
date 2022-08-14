const { ethers, network, getChainId } = require("hardhat")
const fs = require("fs")

const frontEndContractsFile = "../nextjs-nft-marketplace-moralis/constants/networkMapping.json"

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating front end...")
        await updateContractAddresses()
    }
}

async function updateContractAddresses() {
    const nftMarkteplace = await ethers.getContract("NftMarketplace")
    const chainId = (await getChainId()).toString()
    const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf-8"))
    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId]["NftMarketplace"].includes(nftMarkteplace.address)) {
            contractAddresses[chainId]["NftMarketplace"].push(nftMarkteplace.address)
        }
    } else {
        contractAddresses[chainId] = { NftMarketplace: [nftMarkteplace.address] }
    }
    fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
}

module.exports.tags = ["all", "frontend"]
