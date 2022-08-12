const { assert, expect } = require("chai")
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip()
    : describe("Nft Marketplace Unit Tests", function () {
          let nftMarketplace, basicNft, deployer, player
          const PRICE = ethers.utils.parseEther("0.1")
          const TOKEN_ID = 0

          beforeEach(async function () {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              player = accounts[1]
              await deployments.fixture(["all"])
              nftMarketplace = await ethers.getContract("NftMarketplace")
              basicNft = await ethers.getContract("BasicNft")
              await basicNft.mintNft()
              await basicNft.approve(nftMarketplace.address, TOKEN_ID)
          })

          describe("listItem", function () {
              it("lists the item", async function () {
                  await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(
                      nftMarketplace,
                      "ItemListed"
                  )
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                  assert.equal(listing.price.toString(), PRICE.toString())
              })
              it("exclusively items that haven't been listed", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith(
                      `NftMarketplace__AlreadyListed("${basicNft.address}", ${TOKEN_ID})`
                  )
              })
              it("prices <= 0 are not allowed", async function () {
                  const newPrice = ethers.utils.parseEther("0")
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, newPrice)
                  ).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZero")
              })
              it("exclusively allows owners to list", async function () {
                  const playerConnectedNftMarketplace = nftMarketplace.connect(player)
                  await basicNft.approve(player.address, TOKEN_ID)
                  await expect(
                      playerConnectedNftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotOwner")
              })
              it("needs approvals to list item", async function () {
                  await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID)
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace")
              })
          })

          describe("buyItem", function () {
              it("can buy and emits an event", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const playerConnectedNftMarketplace = nftMarketplace.connect(player)
                  await expect(
                      playerConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                          value: PRICE,
                      })
                  ).to.emit(playerConnectedNftMarketplace, "ItemBought")
                  const newOwner = await basicNft.ownerOf(TOKEN_ID)
                  const deployerProceeds = await nftMarketplace.getProceeds(deployer.address)
                  assert.equal(newOwner, player.address)
                  assert.equal(deployerProceeds.toString(), PRICE.toString())
              })
              it("reverts if not listed", async function () {
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                          value: PRICE,
                      })
                  ).to.be.revertedWith("NftMarketplace__NotListed")
              })
              it("reverts if the price is not met", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const fakePrice = ethers.utils.parseEther("0.01")
                  const playerConnectedNftMarketplace = nftMarketplace.connect(player)
                  await expect(
                      playerConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                          value: fakePrice,
                      })
                  ).to.be.revertedWith("NftMarketplace__PriceNotMet")
              })
          })

          describe("cancelListing", function () {
              it("can cancel listing and emits an event", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                  await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  const canceledListing = await nftMarketplace.getListing(
                      basicNft.address,
                      TOKEN_ID
                  )
                  assert.notEqual(listing.toString(), canceledListing.toString())
              })
              it("reverts if not listed", async function () {
                  await expect(
                      nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NftMarketplace__NotListed")
              })
              it("reverts if not the owner", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const playerConnectedNftMarketplace = nftMarketplace.connect(player)
                  await expect(
                      playerConnectedNftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWith("NftMarketplace__NotOwner")
              })
              it("emits an event", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await expect(nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)).to.emit(
                      nftMarketplace,
                      "ItemCanceled"
                  )
              })
          })

          describe("updateListing", function () {
              it("can update listing", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const listing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                  const newPrice = ethers.utils.parseEther("0.2")
                  expect(
                      await nftMarketplace.updateListing(basicNft.address, TOKEN_ID, newPrice)
                  ).to.emit("ItemListed")
                  const updatedListing = await nftMarketplace.getListing(basicNft.address, TOKEN_ID)
                  assert.notEqual(listing, updatedListing)
                  assert.equal(updatedListing.price.toString(), newPrice)
              })
              it("reverts if not listed", async function () {
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWith("NftMarketplace__NotListed")
              })
              it("reverts if not the owner", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const newPrice = ethers.utils.parseEther("0.2")
                  const playerConnectedNftMarketplace = nftMarketplace.connect(player)
                  await expect(
                      playerConnectedNftMarketplace.updateListing(
                          basicNft.address,
                          TOKEN_ID,
                          newPrice
                      )
                  ).to.be.revertedWith("NftMarketplace__NotOwner")
              })
          })

          describe("withdrawProceeds", function () {
              it("reverts if there are 0 proceeds", async function () {
                  await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWith(
                      "NftMarketplace__NoProceeds"
                  )
              })
              it("can withdraw proceeds", async function () {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const playerConnectedNftMarketplace = nftMarketplace.connect(player)
                  await playerConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                      value: PRICE,
                  })

                  const balanceBeforeWithdraw = await deployer.getBalance()
                  const proceedsBefore = await nftMarketplace.getProceeds(deployer.address)
                  const tx = await nftMarketplace.withdrawProceeds()
                  const txReceipt = await tx.wait(1)
                  const { gasUsed, effectiveGasPrice } = txReceipt
                  const gas = gasUsed.mul(effectiveGasPrice)
                  const balanceAfterWithdraw = await deployer.getBalance()

                  assert.equal(
                      balanceAfterWithdraw.add(gas).toString(),
                      proceedsBefore.add(balanceBeforeWithdraw).toString()
                  )
              })
          })
      })
