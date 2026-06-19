###############################################################################
# VPC + Internet Gateway
###############################################################################

resource "aws_vpc" "this" {
  cidr_block           = var.vpc_cidr
  enable_dns_support   = true
  enable_dns_hostnames = true
  tags                 = merge(var.tags, { Name = "${var.name_prefix}-vpc" })
}

resource "aws_internet_gateway" "this" {
  vpc_id = aws_vpc.this.id
  tags   = merge(var.tags, { Name = "${var.name_prefix}-igw" })
}

###############################################################################
# Subnets (one of each tier per AZ)
###############################################################################

resource "aws_subnet" "public" {
  count                   = length(var.azs)
  vpc_id                  = aws_vpc.this.id
  cidr_block              = var.public_subnet_cidrs[count.index]
  availability_zone       = var.azs[count.index]
  map_public_ip_on_launch = true
  tags = merge(var.tags, {
    Name = "${var.name_prefix}-public-${var.azs[count.index]}"
    Tier = "public"
  })
}

resource "aws_subnet" "app_private" {
  count             = length(var.azs)
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.app_private_subnet_cidrs[count.index]
  availability_zone = var.azs[count.index]
  tags = merge(var.tags, {
    Name = "${var.name_prefix}-app-${var.azs[count.index]}"
    Tier = "app-private"
  })
}

resource "aws_subnet" "db_private" {
  count             = length(var.azs)
  vpc_id            = aws_vpc.this.id
  cidr_block        = var.db_private_subnet_cidrs[count.index]
  availability_zone = var.azs[count.index]
  tags = merge(var.tags, {
    Name = "${var.name_prefix}-db-${var.azs[count.index]}"
    Tier = "db-private"
  })
}

###############################################################################
# Route tables
#   public  -> IGW
#   app     -> (no default route here; 0.0.0.0/0 -> NAT ENI is added by the
#               compute stack so the persistent layer stays NAT-agnostic)
#   db      -> isolated (local only)
###############################################################################

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.this.id
  tags   = merge(var.tags, { Name = "${var.name_prefix}-public-rt" })
}

resource "aws_route" "public_internet" {
  route_table_id         = aws_route_table.public.id
  destination_cidr_block = "0.0.0.0/0"
  gateway_id             = aws_internet_gateway.this.id
}

resource "aws_route_table_association" "public" {
  count          = length(var.azs)
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

# One app-private route table per AZ — the compute stack adds the default
# route to the NAT instance for each of these.
resource "aws_route_table" "app_private" {
  count  = length(var.azs)
  vpc_id = aws_vpc.this.id
  tags = merge(var.tags, {
    Name = "${var.name_prefix}-app-rt-${var.azs[count.index]}"
  })
}

resource "aws_route_table_association" "app_private" {
  count          = length(var.azs)
  subnet_id      = aws_subnet.app_private[count.index].id
  route_table_id = aws_route_table.app_private[count.index].id
}

# DB subnets are fully isolated (no internet route).
resource "aws_route_table" "db_private" {
  vpc_id = aws_vpc.this.id
  tags   = merge(var.tags, { Name = "${var.name_prefix}-db-rt" })
}

resource "aws_route_table_association" "db_private" {
  count          = length(var.azs)
  subnet_id      = aws_subnet.db_private[count.index].id
  route_table_id = aws_route_table.db_private.id
}
