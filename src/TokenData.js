import React, {useEffect, useState} from "react";
import * as fcl from "@onflow/fcl";
import * as t from "@onflow/types"

const TokenData = () => {
    const [tokensToSell, setTokensToSell] = useState([])

    useEffect(() => {
        checkMarketplace()
    }, []);

    const checkMarketplace = async () => {
        try {
            const encoded = await fcl.send([
                fcl.script`
       import MarketplaceContract from 0xf8d6e0586b0a20c7
        pub fun main(): [UInt64] {
            let account1 = getAccount(0xf8d6e0586b0a20c7)
            let acct1saleRef = account1.getCapability<&AnyResource{MarketplaceContract.SalePublic}>(/public/NFTSale)
                .borrow()
                ?? panic("Could not borrow acct2 nft sale reference")
            return acct1saleRef.getIDs()
        }
        `
            ]);
            const decoded = await fcl.decode(encoded);
            let marketplaceMetadata = [];
            for (const id of decoded) {
                const encodedMetadata = await fcl.send([
                    fcl.script`
        import PinataPartyContract from 0xf8d6e0586b0a20c7
        pub fun main(id: UInt64) : {String : String} {
          let nftOwner = getAccount(0xf8d6e0586b0a20c7)  
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
    import MarketplaceContract from 0xf8d6e0586b0a20c7
    pub fun main(id: UInt64): UFix64? {
        let account1 = getAccount(0xf8d6e0586b0a20c7)
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
                                <img src={`https://ipfs.io/ipfs/${token["uri"].split("://")[1]}`} className={"video"}/>
                                <h4>Price</h4>
                                <p>{parseInt(token.price, 10).toFixed(2)} Pinnies</p>
                                <button className="btn-primary">Buy Now</button>
                            </div>
                        </div>
                    )
                })
            }
        </div>
    );
};

export default TokenData;