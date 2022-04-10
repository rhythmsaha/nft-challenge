import {
  useAddress,
  useDisconnect,
  useMetamask,
  useNFTDrop,
} from '@thirdweb-dev/react';
import { BigNumber } from 'ethers';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { sanityClient, urlFor } from '../../sanity';
import { Collection } from '../../typings';

interface Props {
  collection: Collection;
}

const NFTDropPage = ({ collection }: Props) => {
  const [claimedSupply, setClaimedSupply] = useState<Number>(0);
  const [totalSupply, setTotalSupply] = useState<BigNumber>();
  const [loading, setLoading] = useState<boolean>(true);
  const [priceInEth, setPriceInEth] = useState<string>();

  const nftDrop = useNFTDrop(collection.address);

  useEffect(() => {
    if (!nftDrop) return;

    const fetchPrice = async () => {
      const claimConditions = await nftDrop.claimConditions.getAll();
      setPriceInEth(claimConditions?.[0].currencyMetadata.displayValue);
    };
    fetchPrice();
  }, []);

  useEffect(() => {
    if (!nftDrop) return;

    const fetchNFTDropData = async () => {
      setLoading(true);
      const claimed = await nftDrop.getAllClaimed();
      const total = await nftDrop.totalSupply();

      setClaimedSupply(claimed.length);
      setTotalSupply(total);

      setLoading(false);
    };

    fetchNFTDropData();
  }, [nftDrop]);

  // Auth
  const connectWithMetamask = useMetamask();
  const address = useAddress();
  const disconnect = useDisconnect();
  // ---

  const mindNFT = () => {
    if (!nftDrop || !address) return;

    const quantity = 1;

    setLoading(true);

    nftDrop
      ?.claimTo(address, quantity)
      .then(async (tx) => {
        const recipt = tx[0].receipt; //The Transaction Recipt
        const claimedTokenID = tx[0].id;
        const claimedNFT = await tx[0].data();

        console.log(recipt);
        console.log(claimedTokenID);
        console.log(claimedNFT);
      })
      .catch((err) => {
        console.log(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  return (
    <>
      <Head>
        <title>{collection.title}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div className="flex min-h-screen flex-col lg:grid lg:grid-cols-10">
        <div className="bg-gradient-to-br from-cyan-800 to-rose-500 lg:col-span-4">
          <div className="flex flex-col items-center justify-center py-2 lg:min-h-screen">
            <div className="rounded-xl bg-gradient-to-br from-yellow-400 to-purple-600 p-2">
              <img
                className="w-44 rounded-xl object-cover lg:h-96 lg:w-72"
                src={urlFor(collection.previewImage).url()}
                alt="nft-ape-image"
              />
            </div>
            <div className="space-y-2 p-5 text-center">
              <h1 className="text-4xl font-bold uppercase text-white">
                {collection.nftCollectionName}
              </h1>
              <h2 className="text-xl text-gray-300">
                {collection.description}
              </h2>
            </div>
          </div>
        </div>
        {/* Right */}
        <div className="flex flex-1 flex-col p-12 lg:col-span-6">
          {/* Header */}
          <header className="flex items-center justify-between">
            <Link href="/">
              <h1 className="w-52 cursor-pointer text-xl font-extralight sm:w-80">
                The{' '}
                <span className="font-extrabold underline decoration-pink-600/50">
                  PAPAFAM
                </span>{' '}
                NFT Market Place
              </h1>
            </Link>
            <button
              onClick={() => {
                address ? disconnect() : connectWithMetamask();
              }}
              className="rounded-full bg-rose-400 px-4 py-2 text-xs font-bold text-white lg:px-6 lg:py-3 lg:text-base"
            >
              {address ? 'Sign Out' : 'Sign In'}
            </button>
          </header>
          <hr className="my-4 border" />
          {address && (
            <p className="text-center text-sm text-green-400">
              You are logged in with wallet {address.substring(0, 5)}...
              {address.substring(address.length - 5)}
            </p>
          )}
          {/* content */}
          <div className="mt-10 flex flex-1 flex-col items-center space-y-6 text-center lg:justify-center  lg:space-y-0">
            <img
              className="w-80 object-cover pb-10 lg:h-40"
              src={urlFor(collection.mainImage).url()}
              alt="nfts"
            />
            <h1 className="text-3xl font-bold lg:text-5xl lg:font-extrabold">
              {collection.title}
            </h1>

            {loading ? (
              <p className="animate-pulse pt-2 text-xl text-green-500">
                Loading supply count...
              </p>
            ) : (
              <p className="pt-2 text-xl text-green-500">
                {claimedSupply}/{totalSupply?.toString()} NFTs claimed
              </p>
            )}
          </div>
          {/* Mint Button */}
          <button
            onClick={mindNFT}
            disabled={
              loading || claimedSupply === totalSupply?.toNumber() || !address
            }
            className="mt-10 h-16 w-full cursor-pointer rounded-full bg-rose-600 font-bold text-white  disabled:bg-gray-400"
          >
            {loading ? (
              <>Loading...</>
            ) : claimedSupply === totalSupply?.toNumber() ? (
              <>Sold Out</>
            ) : !address ? (
              <>Sign In to Mint</>
            ) : (
              <span className="font-bold">Mint NFT ({priceInEth} ETH)</span>
            )}
          </button>
        </div>
      </div>
    </>
  );
};

export default NFTDropPage;

export const getServerSideProps: GetServerSideProps = async ({ params }) => {
  const query = `*[_type == 'collection' && slug.current == $id] [0] {
    _id,
    title,
    address,
    description,
    nftCollectionName,
    mainImage{
      asset
    },
    previewImage{
      asset
    },
    slug {
      current
    },
    creator-> {
      _id,
      name,
      address,
      slug {
        current
      },
    },
  }`;

  const collection = await sanityClient.fetch(query, {
    id: params?.id,
  });

  if (!collection) {
    return {
      notFound: true,
    };
  }

  return {
    props: {
      collection,
    },
  };
};
