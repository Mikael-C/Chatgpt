import { Modal, List, Avatar, Typography, Card } from 'antd';
import { ProviderGroup, AIModel } from '../../hooks/useModelSelector';

interface ModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  providers: ProviderGroup[];
  loading: boolean;
  onSelect: (model: AIModel) => void;
}

export const ModelSelector = ({ isOpen, onClose, providers, loading, onSelect }: ModelSelectorProps) => {
  return (
    <Modal
      title="Select AI Model"
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <List
        loading={loading}
        dataSource={providers}
        renderItem={(provider) => (
          <Card style={{ marginBottom: '16px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
              <Avatar 
                src={provider.providerLogoUrl} 
                size={48}
                style={{ marginRight: '16px' }}
              >
                {!provider.providerLogoUrl && (provider.providerName?.charAt(0) || '?')}
              </Avatar>
              <Typography.Title level={4}>{provider.providerName}</Typography.Title>
            </div>
            <List
              size="small"
              dataSource={provider.models}
              renderItem={(model) => (
                <List.Item 
                  onClick={() => onSelect(model)}
                  style={{ cursor: 'pointer', padding: '8px 16px' }}
                  className="model-list-item"
                >
                  <Typography.Text>{model.id}</Typography.Text>
                </List.Item>
              )}
            />
          </Card>
        )}
      />
    </Modal>
  );
};
