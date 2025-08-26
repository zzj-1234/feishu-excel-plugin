import React, { useState } from 'react';
import { Upload, Button, Table, Modal, Select, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { Option } = Select;

// 示例：飞书多维表格字段名（实际应通过API获取）
const feishuFields = [
  { key: 'name', label: '姓名' },
  { key: 'age', label: '年龄' },
  { key: 'department', label: '部门' },
];

function App() {
  const [excelData, setExcelData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [modalVisible, setModalVisible] = useState(false);

  // 处理Excel文件
  const handleExcel = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet);
      if (json.length === 0) {
        message.error('Excel内容为空');
        return;
      }
      setExcelData(json);
      setColumns(Object.keys(json[0]));
      setModalVisible(true);
    };
    reader.readAsArrayBuffer(file);
    return false; // 阻止自动上传
  };

  // 字段映射选择
  const handleMappingChange = (excelCol, feishuKey) => {
    setMapping({ ...mapping, [excelCol]: feishuKey });
  };

  // 导入到飞书（伪代码，需替换为实际API调用）
  const importToFeishu = () => {
    // 构造飞书API需要的数据结构
    const mappedData = excelData.map(row => {
      const obj = {};
      Object.entries(mapping).forEach(([excelCol, feishuKey]) => {
        obj[feishuKey] = row[excelCol];
      });
      return obj;
    });
    // TODO: 调用飞书API批量导入 mappedData
    message.success('数据已准备好，可调用飞书API导入');
    setModalVisible(false);
  };

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 8 }}>
      <h2>Excel 导入飞书多维表格</h2>
      <Upload
        beforeUpload={handleExcel}
        showUploadList={false}
        accept=".xlsx,.xls"
        multiple
      >
        <Button icon={<UploadOutlined />}>拖拽或点击上传 Excel 文件</Button>
      </Upload>
      <Modal
        title="字段映射"
        open={modalVisible}
        onOk={importToFeishu}
        onCancel={() => setModalVisible(false)}
      >
        <Table
          dataSource={columns.map(col => ({ excelCol: col }))}
          columns={[{
            title: 'Excel表头',
            dataIndex: 'excelCol',
            key: 'excelCol',
          }, {
            title: '飞书字段',
            dataIndex: 'feishuField',
            key: 'feishuField',
            render: (_, record) => (
              <Select
                style={{ width: 120 }}
                value={mapping[record.excelCol]}
                onChange={val => handleMappingChange(record.excelCol, val)}
                placeholder="选择字段"
              >
                {feishuFields.map(f => (
                  <Option key={f.key} value={f.key}>{f.label}</Option>
                ))}
              </Select>
            )
          }]}
          pagination={false}
          rowKey="excelCol"
        />
      </Modal>
      {excelData.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h3>Excel数据预览</h3>
          <Table dataSource={excelData} columns={columns.map(col => ({ title: col, dataIndex: col, key: col }))} rowKey={(_, idx) => idx} pagination={{ pageSize: 10 }} />
        </div>
      )}
    </div>
  );
}

export default App;
