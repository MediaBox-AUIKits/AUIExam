import { ExamContext } from "@/context/exam";
import { RadioTimer, IRadioItem, RadioStatusEnum } from "@/core";
import services from "@/utils/services";
import {
  Alert,
  Button,
  Input,
  Modal,
  Pagination,
  Popover,
  Table,
  Tabs,
  Tag,
} from "antd";
import Dayjs from "dayjs";
import { useContext, useEffect, useRef, useState } from "react";
import "./index.less";

type AudioData = { id: string; url: string; name: string; classify: number };

type SystemBroadcastProp = {
  show: boolean;
  onCancel: () => void;
  onAudioPlay: (data: AudioData) => void;
};

function AudioListItem({
  item,
  element,
  onAudioPlay,
}: {
  item: AudioData;
  element: any;
  onAudioPlay: (data: AudioData) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div key={item.id} className="audio_list_item">
      <label>{item.name}</label>
      <Popover
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
        }}
        getPopupContainer={() => element}
        placement="topRight"
        trigger={"click"}
        content={
          <div style={{ width: "200px", height: "65px", position: "relative" }}>
            <Alert message="确认播放该音频吗？" banner />
            <div style={{ position: "absolute", right: "0px" }}>
              <Button
                size="small"
                onClick={() => {
                  setOpen(false);
                }}
              >
                取消
              </Button>
              <Button
                size="small"
                style={{ marginLeft: "10px" }}
                type="primary"
                onClick={() => {
                  onAudioPlay(item);
                }}
              >
                确认
              </Button>
            </div>
          </div>
        }
      >
        <Button className="play" type="link">
          播放
        </Button>
      </Popover>
    </div>
  );
}

function AudioList({
  activeCategory,
  category,
  name,
  onAudioPlay,
}: {
  activeCategory: string;
  category: string;
  name: string;
  onAudioPlay: (data: AudioData) => void;
}) {
  const [total, setTotal] = useState(0);
  const pageSize = 10;
  const [pageNum, setPageNum] = useState(1);
  const [list, setList] = useState<Array<AudioData>>([]);
  const containerRef = useRef<any>();

  useEffect(() => {
    if (activeCategory !== category) {
      return;
    }
    services
      .selectAudio({
        pageNum,
        pageSize,
        name: name,
        classify: Number(category),
      })
      .then(({ total, list }: any) => {
        setTotal(total);
        setList(list || []);
      });
  }, [activeCategory, category, name, pageNum]);

  return (
    <div className="audio_list_container" ref={containerRef}>
      <div className="audio_list">
        {list.map((item) => {
          return (
            <AudioListItem
              key={item.id}
              item={item}
              element={containerRef.current}
              onAudioPlay={onAudioPlay}
            />
          );
        })}
      </div>
      <Pagination
        simple
        total={total}
        pageSize={pageSize}
        onChange={(page) => {
          setPageNum(page);
        }}
        current={pageNum}
      />
    </div>
  );
}

interface SystemBroadcastStatusProps {
  radioTimer: RadioTimer;
  id: string;
  status: RadioStatusEnum;
}

function SystemBroadcastStatus({
  radioTimer,
  id,
  status,
}: SystemBroadcastStatusProps) {
  const [localStatus, setLocalStatus] = useState(status);
  useEffect(() => {
    const onStatusChange = (newItem: IRadioItem) => {
      if (newItem.id !== id) return;
      setLocalStatus(newItem.status);
    };

    radioTimer.on("statusChange", onStatusChange);
    return () => {
      radioTimer.remove("statusChange", onStatusChange);
    };
  }, []);

  useEffect(() => {
    setLocalStatus(status);
  }, [status]);

  if (localStatus === RadioStatusEnum.playing) {
    return <Tag color="green">播放中</Tag>;
  }

  if (localStatus === RadioStatusEnum.ended) {
    return <Tag>已播放</Tag>;
  }

  return <Tag>未播放</Tag>;
}

export default function SystemBroadcast({
  show,
  onCancel,
  onAudioPlay,
}: SystemBroadcastProp) {
  const { radioTimer } = useContext(ExamContext);
  const [activeAudioCategory, setActiveAudioCategory] = useState("1");
  const [audioSearchName, setAudioSearchName] = useState("");
  const [list, setList] = useState(radioTimer.getList());
  useEffect(() => {
    const onListUpdate = (newList: any) => {
      setList(newList);
    };
    radioTimer.on("listChange", onListUpdate);

    return () => {
      radioTimer.remove("listChange", onListUpdate);
    };
  }, []);

  return (
    <Modal
      open={show}
      width={775}
      onCancel={onCancel}
      title={"本场考试定时音频"}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          取消
        </Button>,
      ]}
    >
      <div className="system_broadcast_container">
        <div className="left" style={{ width: "400px" }}>
          <div className="title">定时音频列表</div>
          {/* scroll 高度为总高度 380 - title 高度 40 - 表头高度 40 */}
          <Table
            rowKey="id"
            dataSource={list}
            pagination={false}
            scroll={{ y: 300 }}
          >
            <Table.Column
              title="序号"
              dataIndex={"id"}
              key="id"
              render={(_, __, index) => index + 1}
            />
            <Table.Column title="音频名称" dataIndex={"name"} key="name" />
            <Table.Column
              title="播放时间"
              dataIndex={"startTime"}
              key="startTime"
              render={(value) => {
                const date = Dayjs(value);
                return <>{date.format("HH:mm:ss")}</>;
              }}
            />
            <Table.Column
              title="播放状态"
              dataIndex={"status"}
              key="status"
              render={(value, record: IRadioItem) => (
                <SystemBroadcastStatus
                  id={record.id}
                  radioTimer={radioTimer}
                  status={value}
                />
              )}
            />
          </Table>
        </div>
        <div className="right">
          <Input.Search
            placeholder="搜索"
            onSearch={(value) => {
              setAudioSearchName(value);
            }}
          />
          <Tabs
            activeKey={activeAudioCategory}
            onChange={(key) => {
              setActiveAudioCategory(key);
            }}
            items={[
              {
                label: "类型1",
                key: "1",
                children: (
                  <AudioList
                    activeCategory={activeAudioCategory}
                    category="1"
                    name={audioSearchName}
                    onAudioPlay={onAudioPlay}
                  />
                ),
              },
              {
                label: "类型2",
                key: "2",
                children: (
                  <AudioList
                    activeCategory={activeAudioCategory}
                    category="2"
                    name={audioSearchName}
                    onAudioPlay={onAudioPlay}
                  />
                ),
              },
              // {
              //   label: '英语',
              //   key: '3',
              //   children:
              //     <AudioList
              //       activeCategory={activeAudioCategory}
              //       category="3"
              //       name={audioSearchName}
              //       onAudioPlay={onAudioPlay}/>
              // }
            ]}
          ></Tabs>
        </div>
      </div>
    </Modal>
  );
}
