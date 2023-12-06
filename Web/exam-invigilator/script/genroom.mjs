import axios from 'axios';

// 请输入您的服务端的域名，结尾请勿是 /
const apiOrigin = 'your appserver origin';
// 监考端域名，请根据您的实际情况更改，特别是本地运行时，要注意监考端的端口是否一致
const invigilatorBasePath = 'http://localhost:8000';
// 考生端域名，请根据您的实际情况更改，特别是本地运行时，要注意考生端的端口是否一致
const examineeBasePath = 'http://localhost:8001';

const now = new Date();

async function main() {
  const roomRes = await axios.post(
    `${apiOrigin}/exam/createRoom`,
    {
      name: `模拟考场${now.getMonth() + 1}-${now.getDate()} ${now.getHours()}:${now.getMinutes()}`,
    },
    {
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
    }
  );
  const { id: roomId, createTeacher } = roomRes.data.data;
  console.log('监考端体验地址 -> ', `${invigilatorBasePath}?roomId=${roomId}&userId=${createTeacher}&token=xxx&role=0`);

  const listRes = await axios.get(
    `${apiOrigin}/exam/userList`,
    {
      params: {
        roomId,
      },
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
    }
  );
  const examineeId = (listRes.data.data || [])[0].id;
  console.log('考生端体验地址 -> ', `${examineeBasePath}?roomId=${roomId}&userId=${examineeId}&token=xxxx#/pc`);
}

main()
  .then(() => {})
  .catch((err) => {
    console.log('创建异常！', err);
  });
