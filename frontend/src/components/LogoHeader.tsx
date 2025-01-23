import { Avatar, Space, Typography } from 'antd';

function LogoHeader() {
    return (
        <div style={{
            textAlign: "center",
            padding: "1rem"
        }}>
            <Space direction="vertical">
                <Avatar size={64} src="/icon.png" />
                <Typography.Title level={3}  className='title'>Unleash your creativity with AI</Typography.Title>
                <Typography.Paragraph >Generate your ideas into stunning visuals</Typography.Paragraph>
            </Space>

        </div>
    )
}

export default LogoHeader;