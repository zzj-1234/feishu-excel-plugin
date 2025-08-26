import React, { useState, useEffect } from 'react';
import { Upload, Button, Table, Modal, Select, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';

const { Option } = Select;

// 飞书API参数
const APP_TOKEN = 'VTBgbN0PFa89swsnc6ic7RLHnLc';
const TABLE_ID = 'tblFkhgOCzowbyt5';
const FEISHU_API = `https://open.feishu.cn/open-apis/bitable/v1/apps/${APP_TOKEN}/tables/${TABLE_ID}/fields`;
// 自动填充 user_access_token（仅限个人测试，勿公开部署）
const FEISHU_TOKEN = 'u-cCGr2Gq51fEXWXF8EZxqKo545yAkkhwpi200l1q82BGx';

function App() {
  const [excelData, setExcelData] = useState([]);
  const [columns, setColumns] = useState([]);
  const [mapping, setMapping] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [feishuFields, setFeishuFields] = useState([]);

  // 获取飞书字段名
  useEffect(() => {
    async function fetchFields() {
      if (!FEISHU_TOKEN) return; // 未配置token时不请求
      try {
        const res = await fetch(FEISHU_API, {
          headers: { Authorization: `Bearer ${FEISHU_TOKEN}` }
        });
        const result = await res.json();
        if (result.code === 0 && result.data.fields) {
          setFeishuFields(result.data.fields.map(f => ({ key: f.id, label: f.name })));
        } else {
          message.error('飞书字段获取失败：' + (result.msg || result.code));
        }
      } catch (err) {
        message.error('飞书字段获取异常：' + err.message);
      }
    }
    fetchFields();
  }, []);

  // 处理多个Excel文件
  const handleExcel = (file, fileListRaw) => {
    const files = fileListRaw || [file];
    setFileList(files);
    let allData = [];
    let allColumns = new Set();
    let readCount = 0;
    files.forEach(f => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        if (json.length === 0) {
          message.error(`${f.name} 内容为空`);
        } else {
          allData = allData.concat(json);
          Object.keys(json[0]).forEach(col => allColumns.add(col));
        }
        readCount++;
        if (readCount === files.length) {
          if (allData.length === 0) {
            message.error('所有Excel内容为空');
            return;
          }
          setExcelData(allData);
          setColumns(Array.from(allColumns));
          // 自动字段映射：表头与飞书字段名智能匹配
          const autoMap = {};
          Array.from(allColumns).forEach(col => {
            const match = feishuFields.find(f => f.label === col || f.key === col);
            if (match) autoMap[col] = match.key;
          });
          setMapping(autoMap);
          setModalVisible(true);
        }
      };
      reader.readAsArrayBuffer(f);
    });
    return false; // 阻止自动上传
  };

  // 字段映射选择
  const handleMappingChange = (excelCol, feishuKey) => {
    setMapping({ ...mapping, [excelCol]: feishuKey });
  };

  // 导入到飞书（需补充API鉴权和表格ID等参数）
  const importToFeishu = async () => {
    const mappedData = excelData.map(row => {
      const obj = {};
      Object.entries(mapping).forEach(([excelCol, feishuKey]) => {
        obj[feishuKey] = row[excelCol];
      });
      return obj;
    });
    // 示例API调用（需替换为实际表格ID和鉴权）
    try {
      // const res = await fetch('https://open.feishu.cn/open-apis/bitable/v1/apps/{app_token}/tables/{table_id}/records/batch_create', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': 'Bearer {token}',
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({ records: mappedData.map(data => ({ fields: data })) })
      // });
      // const result = await res.json();
      // if (result.code === 0) {
      //   message.success('导入成功');
      // } else {
      //   message.error('导入失败：' + result.msg);
      // }
      message.success('数据已准备好，可调用飞书API导入（请补充鉴权和表格ID）');
    } catch (err) {
      message.error('导入失败：' + err.message);
    }
    setModalVisible(false);
  };

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: 24, background: '#fff', borderRadius: 8 }}>
      <h2>Excel 导入飞书多维表格</h2>
      <Upload
        beforeUpload={(file, fileListRaw) => handleExcel(file, fileListRaw)}
        showUploadList={true}
        accept=".xlsx,.xls"
        multiple
        fileList={fileList}
        onRemove={file => {
          const newList = fileList.filter(f => f.uid !== file.uid);
          setFileList(newList);
        }}
      >
        <Button icon={<UploadOutlined />}>拖拽或点击上传多个 Excel 文件</Button>
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
