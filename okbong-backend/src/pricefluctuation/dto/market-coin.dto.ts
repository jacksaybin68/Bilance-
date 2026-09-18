import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsIn,
  IsString,
  Matches,
  IsArray,
  IsNumber,
} from 'class-validator';
import {
  ASSET_CLASSES,
  DEFAULT_ASSET_CLASS,
  IMPLEMENTED_ASSET_CLASSES,
  type AssetClass,
} from './asset-class.dto';

export class MarketCoinDto {
  @ApiProperty({ example: 'bitcoin', description: 'ID CoinGecko' })
  id!: string;

  @ApiProperty({ example: 'BTC', description: 'Ký hiệu tiền tệ (UPPERCASE)' })
  symbol!: string;

  @ApiProperty({ example: 'Bitcoin', description: 'Tên tiền tệ' })
  name!: string;

  @ApiProperty({
    example:
      'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400',
    description: 'URL logo tiền tệ (null nếu nguồn không trả)',
    nullable: true,
  })
  image!: string | null;

  @ApiProperty({
    example: 1985259449,
    description: 'Giá hiện tại theo đơn vị vs_currency',
  })
  price!: number;

  @ApiProperty({ example: 'VND', description: 'Đơn vị tiền tệ' })
  currency!: string;

  @ApiProperty({
    example: 0.09551,
    description: 'Phần trăm biến động 24h (có thể âm)',
  })
  change24h!: number;

  @ApiProperty({
    example: 760868602834255,
    description: 'Khối lượng giao dịch 24h (có thể null)',
    nullable: true,
  })
  volume24h!: number | null;

  @ApiProperty({
    example: 39827152756985760,
    description: 'Vốn hóa thị trường (có thể null)',
    nullable: true,
  })
  marketCap!: number | null;

  @ApiProperty({
    example: [1955032847, 1967000000, 1972000000],
    description: 'Dữ liệu biểu đồ 7 ngày (~168 điểm), mảng rỗng nếu không có',
    type: [Number],
  })
  sparkline!: number[];

  @ApiProperty({
    example: '2026-09-17T11:58:00.000Z',
    description: 'Thời điểm cập nhật cuối cùng',
  })
  updatedAt!: string;

  @ApiProperty({
    example: false,
    description:
      'true nếu dữ liệu lấy từ cache cũ do nguồn lỗi/timeout',
  })
  stale?: boolean;

  @ApiPropertyOptional({
    enum: ASSET_CLASSES,
    default: DEFAULT_ASSET_CLASS,
    description:
      'Lớp tài sản của entry (ADR 008). Mặc định `crypto` khi không có provider khác.',
  })
  assetClass?: AssetClass;
}

export class MarketMetaDto {
  @ApiProperty({
    enum: ['coingecko', 'cache'],
    description: 'Nguồn dữ liệu thực tế',
  })
  source!: 'coingecko' | 'cache';

  @ApiProperty({ description: 'Dữ liệu có phải đọc từ cache không' })
  cached!: boolean;

  @ApiProperty({
    description: 'Thời điểm dữ liệu được lấy từ nguồn (ISO-8601)',
  })
  updatedAt!: string;
}

export class MarketQueryDto {
  @ApiPropertyOptional({
    enum: ['vnd', 'usd'],
    default: 'vnd',
    description: 'Đơn vị tiền tệ hiển thị (mặc định VND)',
  })
  @IsOptional()
  @IsIn(['vnd', 'usd'])
  vs?: 'vnd' | 'usd' = 'vnd';

  @ApiPropertyOptional({
    enum: ASSET_CLASSES,
    default: DEFAULT_ASSET_CLASS,
    description:
      `Lớp tài sản cần lấy (ADR 008). Mặc định \`${DEFAULT_ASSET_CLASS}\` (không đổi hành vi cũ). ` +
      `Hiện có provider: ${IMPLEMENTED_ASSET_CLASSES.join(', ')}.`,
  })
  @IsOptional()
  @IsIn(ASSET_CLASSES)
  assetClass?: AssetClass = DEFAULT_ASSET_CLASS;

  @ApiPropertyOptional({
    description:
      'Danh sách id CoinGecko phân tách bằng dấu phẩy (chỉ cho phép a-z0-9 và dấu phẩy)',
    required: false,
    example: 'bitcoin,ethereum,usd-coin',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9,-]+$/, {
    message:
      'ids chỉ được chứa ký tự a-z, 0-9 và dấu phẩy. Ví dụ: bitcoin,ethereum,usd-coin',
  })
  ids?: string;

  @ApiPropertyOptional({
    description:
      'Danh sách symbol phân tách bằng dấu phẩy cho asset class không phải crypto, ' +
      'ví dụ `AAPL,VCB.VN` (equity) hoặc `USDVND=X` (fx). Không dùng cùng `ids`.',
    required: false,
    example: 'AAPL,VCB.VN',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z0-9.,=^-]+$/, {
    message:
      'symbols chỉ được chứa ký tự chữ, số và các ký tự . , = ^ -. Ví dụ: AAPL,VCB.VN',
  })
  symbols?: string;
}
