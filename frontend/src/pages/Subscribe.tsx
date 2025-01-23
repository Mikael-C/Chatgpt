import { Alert, App, Badge, Button, Card, Input, Modal, Space, Spin, Typography, message } from 'antd';
import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { addCredits, invokeSub, writeSubLog } from '../hooks/libs';
import { collection, doc, setDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '../firebase';
import { Capacitor } from '@capacitor/core';
import { LoadingOutlined } from '@ant-design/icons';
import React from 'react';

const Subscribe = () => {
    const [loading, setLoading] = useState(true);
    const [price, setPrice] = useState<any>();
    const history = useHistory();
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [user, setUser] = useState<any>();
    const [products, setProducts] = useState<CdvPurchase.Product[]>([]);
    const [iap, setIap] = useState<CdvPurchase.Store>();

    const Loading = () => { return (<Space direction='horizontal'><Spin indicator={<LoadingOutlined style={{ fontSize: 24 }} spin />} /><Typography.Text>Please wait...</Typography.Text></Space>) };

    const serializeProducts = (products: CdvPurchase.Product[]) => {
        try {
            const serializedProducts = products.map(product => ({
                id: product.id,
                title: product.title,
                description: product.description,
                type: product.type,
                pricing: product.offers.map(offer => ({
                    phases: offer.pricingPhases.map(phase => ({
                        price: phase.price,
                        period: phase.billingPeriod,
                        cycle: phase.billingCycles,
                        priceMicros: phase.priceMicros,
                        paymentMode: phase.paymentMode,
                        recurrenceMode: phase.recurrenceMode,
                    }))
                }))
            }));

            writeSubLog({
                timestamp: new Date().toISOString(),
                platform: Capacitor.getPlatform(),
                products: JSON.stringify(serializedProducts),
                rawProducts: JSON.stringify(products),
                user: user?.uid || 'anonymous'
            });

            localStorage.setItem('sub_products', JSON.stringify(serializedProducts));

            return serializedProducts;
        } catch (error) {
            console.error('Error serializing products:', error);
            return null;
        }
    };

    useEffect(() => {
        const _modal = Modal.info({
            content: <Loading />,
            closable: false,
            footer: null,
            icon: null
        });

        if (localStorage.getItem('session')) {
            let session: any = localStorage.getItem('session');
            session = JSON.parse(session);
            setUser(session);
        }

        invokeSub(() => { }).then((_: CdvPurchase.Store | undefined) => {
            if (_ != undefined) {
                setIap(_);
                console.log('Promise', _);
            }
        }).catch((e: any) => {
            console.log(e);
        }).finally(() => {
            const _sub_products = localStorage.getItem('sub_products') as string;
            const _products: CdvPurchase.Product[] = JSON.parse(_sub_products);
            setProducts(_products);

            serializeProducts(_products);

            _modal.destroy();
        });
    }, []);

    const subscribe = async (product: CdvPurchase.Product) => {

        setLoading(true);
        //iap.when().finished(())
        const _modal = Modal.info({
            content: <Loading />,
            closable: false,
            footer: null,
            icon: null
        });
        //alert(JSON.stringify(product));
        console.log('IAP', iap);
        iap?.get(product.id)?.getOffer()?.order().then((result: any) => {
            if (result) {
                message.error("ERROR. Failed to place order. " + result.code + ": " + result.message);
            }
            else {
                if (product.type == CdvPurchase.ProductType.CONSUMABLE) {
                    // credit user with chat credits
                    const credits = (product.offers[0].pricingPhases[0].priceMicros / 1000000) * 10;
                    addCredits(!Number.isNaN(credits) ? credits : 10);
                    message.success("🪙 Chat credits purchased successfully!!!");
                } else {
                    message.success("🎊 Subscribed successfully!!!");
                    localStorage.setItem('subscribed', '');
                    localStorage.setItem('subscribed_product', JSON.stringify(product));
                    localStorage.setItem('subscribed_result', JSON.stringify(result));
                }
                history.push('/gpt/chat');
            }
        }).catch((e) => {
            alert(`Error: ${e.message}`);
        }).finally(() => {
            _modal.destroy();
        });

    }

    const skip = () => {
        history.push('/gpt/chat');
    }

    return (
        <div style={{ padding: '10px' }}>
            <Card style={{ margin: 'auto', textAlign: 'center', width: '350px' }}>

                <>
                    <Alert message="🔶 Subscribe to have access to all features, this will give you a much better experience on Gpt++. A 3-day free trial included for each package and you can cancel anytime!" type='success' />
                    {
                        products.map(product => {
                            // Skip non-subscription products
                            if (product.type !== CdvPurchase.ProductType.PAID_SUBSCRIPTION) return null;

                            // Find the regular payment offer (without free trial)
                            const regularOffer = product.offers.find(offer => 
                                !offer.pricingPhases.some(phase => phase.paymentMode === 'FreeTrial')
                            );

                            // Get the regular price
                            const regularPrice = regularOffer?.pricingPhases[0]?.price;

                            return (
                                <Badge.Ribbon 
                                    text={
                                        iap?.owned(product.id) 
                                        ? 'subscribed' 
                                        : regularPrice
                                    }
                                >
                                    <React.Fragment>
                                        <Button 
                                            type='dashed' 
                                            style={{ marginTop: '10px', marginBottom: '10px' }} 
                                            size='large' 
                                            disabled={iap?.owned(product.id)} 
                                            block 
                                            onClick={() => { subscribe(product) }}
                                        >
                                            {product.title}
                                        </Button>
                                    </React.Fragment>
                                </Badge.Ribbon>
                            )
                        })
                    }
                </>
                <Typography.Text type="secondary" style={{ display: 'block', marginTop: '10px', fontSize: '12px' }}>
                    Subscription will auto-renew. Cancel anytime in your store settings.
                </Typography.Text>
                <Button block onClick={() => skip()} style={{ marginTop: '10px' }}>{'Cancel'}</Button>
            </Card>
        </div>
    )
}

export default Subscribe;