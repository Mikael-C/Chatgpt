import { useState } from 'react';
import { Modal, Tabs, Upload, Button, message, Alert } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { TabPane } = Tabs;

const allowedFileTypes = ['.pdf', '.csv', '.txt'];

const FileUploadModal = ({ visible, onCancel, onUpload }: any) => {
  const [fileList, setFileList] = useState<any>([]);

  const handleFileListChange = ({ fileList }: any) => {
    setFileList(fileList);
  };
  const renderTab1 = () => {
    return (
      <Upload
        fileList={fileList}
        beforeUpload={(file) => false}
        onChange={handleFileListChange}
      >
        <Button icon={<UploadOutlined />} style={{ marginTop: '5px' }}>Select File</Button>
      </Upload>
    );
  };


  return (
    <Modal visible={visible} onCancel={onCancel} onOk={(e) => onUpload(fileList)}  afterClose={() => setFileList([])}>
      <Tabs>
        <TabPane tab="Select File" key="1">
          {renderTab1()}
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default FileUploadModal;