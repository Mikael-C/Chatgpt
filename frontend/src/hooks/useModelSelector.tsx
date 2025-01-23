import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { firestore as db } from '../firebase';

export interface AIModel {
    id: string;
    name: string;
    type: string | string[];
    logoUrl?: string;
    description?: string;
    provider?: ProviderGroup;
}

export interface ProviderGroup {
    providerName: string;
    providerLogoUrl?: string;
    models: AIModel[];
}

interface UseModelSelectorProps {
    type?: string;
    onSelect?: (model: AIModel) => void;
    defaultModel?: AIModel;
}

export const useModelSelector = ({ type, onSelect, defaultModel }: UseModelSelectorProps = {}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [providers, setProviders] = useState<ProviderGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedModel, setSelectedModel] = useState<AIModel | null>(defaultModel || null);
    useEffect(() => {
        const fetchModels = async () => {
            setLoading(true);
            try {
                const providersRef = collection(db, 'models');
                const providersSnapshot = await getDocs(providersRef);

                const allProviders: ProviderGroup[] = [];

                for (const providerDoc of providersSnapshot.docs) {
                    const providerData = providerDoc.data();
                    const subCollectionRef = collection(db, `models/${providerDoc.id}/models`);
                    const subCollectionSnapshot = await getDocs(subCollectionRef);

                    const models = subCollectionSnapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                        provider: {
                            providerName: providerDoc.id,
                            providerLogoUrl: providerData.logoUrl,
                        },
                    })) as AIModel[];

                    const filteredModels = type
                        ? models.filter((model) =>
                            Array.isArray(model.type)
                                ? model.type.includes(type)
                                : model.type === type
                        )
                        : models;

                    if (filteredModels.length > 0) {
                        allProviders.push({
                            providerName: providerDoc.id,
                            providerLogoUrl: providerData.logoUrl,
                            models: filteredModels,
                        });
                    }
                }

                setProviders(allProviders);
            } catch (error) {
                console.error('Error fetching models:', error);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen) {
            fetchModels();
        }
    }, [isOpen, type]);

    return {
        isOpen,
        setIsOpen,
        providers,
        loading,
        selectedModel,
        selectModel: (model: AIModel) => {
            setSelectedModel(model);
            onSelect?.(model);
            setIsOpen(false);
        },
    };
};
