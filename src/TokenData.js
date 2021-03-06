import React, {useEffect, useState} from "react";
import * as fcl from "@onflow/fcl";
import * as t from "@onflow/types"
import {query} from "@onflow/fcl";

const TokenData = () => {
    const [tokensToSell, setTokensToSell] = useState([])

    useEffect(() => {
        checkMarketplace().then()
    }, []);

    const buyToken = async (tokenId) => {
        const txId = await fcl
            .send([
                fcl.proposer(fcl.authz),
                fcl.payer(fcl.authz),
                fcl.authorizations([fcl.authz]),
                fcl.limit(50),
                fcl.args([
                    fcl.arg(tokenId, t.UInt64)
                ]),
                fcl.transaction`
      import PinataPartyContract from 0xfe4fd66a6dff7c51
      import PinnieToken from 0xfe4fd66a6dff7c51
      import MarketplaceContract from 0xfe4fd66a6dff7c51
      transaction {
          let collectionRef: &AnyResource{PinataPartyContract.NFTReceiver}
          let temporaryVault: @PinnieToken.Vault
          prepare(tokenID: UInt64) {
              let acct = getAccount(0xfe4fd66a6dff7c51)
              self.collectionRef = acct.borrow<&AnyResource{PinataPartyContract.NFTReceiver}>(from: /storage/NFTCollection)!
              let vaultRef = acct.borrow<&PinnieToken.Vault>(from: /storage/MainVault)
                  ?? panic("Could not borrow owner's vault reference")
              self.temporaryVault <- vaultRef.withdraw(amount: 10.0)
          }
          execute {
              let seller = getAccount(0xfe4fd66a6dff7c51)
              let saleRef = seller.getCapability<&AnyResource{MarketplaceContract.SalePublic}>(/public/NFTSale)
                  .borrow()
                  ?? panic("Could not borrow seller's sale reference")
              saleRef.purchase(tokenID: tokenId, recipient: self.collectionRef, buyTokens: <-self.temporaryVault)
          }
      }
    `,
            ])
        await fcl.decode(txId);
        checkMarketplace().then();
    }
    const checkMarketplace = async () => {
        try {
            const encoded = await query({
                cadence: ` import MarketplaceContract from 0xfe4fd66a6dff7c51
        pub fun main(): [UInt64] {
            let account1 = getAccount(0xfe4fd66a6dff7c51)
            let acct1saleRef = account1.getCapability<&AnyResource{MarketplaceContract.SalePublic}>(/public/NFTSale)
                .borrow()
                ?? panic("Could not borrow acct2 nft sale reference")
            return acct1saleRef.getIDs()
        }`,
            })
            const decoded =encoded;
            let marketplaceMetadata = [];
            for (const id of decoded) {
                const encodedMetadata = await fcl.send([
                    fcl.script`
                  import PinataPartyContract from 0xfe4fd66a6dff7c51
                  pub fun main(id: UInt64) : {String : String} {
                    let nftOwner = getAccount(0xfe4fd66a6dff7c51)
                    let capability = nftOwner.getCapability<&{PinataPartyContract.NFTReceiver}>(/public/NFTReceiver)
                    let receiverRef = capability.borrow()
                        ?? panic("Could not borrow the receiver reference")
                    return receiverRef.getMetadata(id: id)
                  }
                `,
                    fcl.args([
                        fcl.arg(id, t.UInt64)
                    ]),
                ]);

                const decodedMetadata = await fcl.decode(encodedMetadata);
                const encodedPrice = await fcl.send([
                    fcl.script`
              import MarketplaceContract from 0xfe4fd66a6dff7c51
              pub fun main(id: UInt64): UFix64? {
                  let account1 = getAccount(0xfe4fd66a6dff7c51)
                  let acct1saleRef = account1.getCapability<&AnyResource{MarketplaceContract.SalePublic}>(/public/NFTSale)
                      .borrow()
                      ?? panic("Could not borrow acct nft sale reference")
                  return acct1saleRef.idPrice(tokenID: id)
              }
            `,
                    fcl.args([
                        fcl.arg(id, t.UInt64)
                    ])
                ])
                decodedMetadata["price"] = await fcl.decode(encodedPrice);
                marketplaceMetadata.push(decodedMetadata);
            }
            console.log(marketplaceMetadata);
            setTokensToSell(marketplaceMetadata)
        } catch (error) {
            console.log("NO NFTs FOR SALE", error)
        }
    }
    return (
        <div className="token-data">
            {
                tokensToSell.map(token => {
                    return (
                        <div key={token.uri} className="listing">
                            <div>
                                <h3>{token.name}</h3>
                                <h4>Stats</h4>
                                <p>Overall Rating: {token.rating}</p>
                                <p>Swing Angle: {token.swing_angle}</p>
                                <p>Swing Velocity: {token.swing_velocity}</p>
                                <h4>Image</h4>
                                <img src={`https://ipfs.io/ipfs/${token["uri"].split("://")[1]}`} className={"video"}
                                     alt={"grdg"}/>
                                <h4>Price</h4>
                                <p>{parseInt(token.price, 10).toFixed(2)} Pinnies</p>
                                <button onClick={() => buyToken(1)} className="btn-primary">Buy Now</button>
                            </div>
                        </div>
                    )
                })
            }
        </div>
    );

};

export default TokenData;